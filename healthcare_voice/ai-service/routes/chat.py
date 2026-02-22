"""Chat WebSocket route for text-based chatbot using OpenAI Chat Completions API"""
import json
import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import httpx

from config import settings
from agents.definitions.head_agent import get_all_tools
from agents.tools import TOOL_HANDLERS
from db import queries

logger = logging.getLogger(__name__)
router = APIRouter()

OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
CHAT_MODEL = "gpt-4o"

CHAT_AGENT_INSTRUCTIONS = """You are a friendly and professional healthcare chat assistant for Marengo Asia Hospitals.

## Your Role
You help patients with:
- Scheduling, rescheduling, or canceling appointments
- Looking up their upcoming appointments
- Finding available appointment times with specific doctors
- Getting information about our doctors, departments, and services
- Answering questions about our hospital locations, hours, and specialties
- Helping patients choose the right location (Faridabad, Gurugram, or Ahmedabad)

## About Marengo Asia Hospitals
Marengo Asia Hospitals is a leading multi-specialty hospital chain in India with 3 locations:

1. **Marengo Asia Hospitals, Faridabad** (450 beds)
   - Address: Plot No.1, HUDA Staff Colony, Sector 16, Faridabad, Haryana 121002
   - Toll-free: 1800-309-2222
   - Specialties: Cardiac Surgery, Urology, Interventional Cardiology, Neurology, Gastroenterology, Nephrology, Liver Transplant, Spine Surgery, Orthopedics, Oncology, Pulmonology, OB-GYN

2. **Marengo Asia Hospitals, Gurugram** (110 beds)
   - Address: Golf Course Extension Road, Sector 56, Sushant Lok II, Gurugram 122011
   - Toll-free: 1800-309-4444
   - Specialties: Neurology, Orthopedics, Oncology, Cardiology, Nephrology, OB-GYN, General Surgery, Endocrinology

3. **Marengo CIMS Hospital, Ahmedabad** (480 beds, JCI/NABH/NABL accredited)
   - Address: Off Science City Road, Sola, Ahmedabad, Gujarat 380060
   - Toll-free: 1800-309-9999
   - Specialties: Cardiology, Neurosurgery, Surgical Oncology, Orthopedics, Gastroenterology, Pulmonology

## Chat-Specific Guidelines
- This is a TEXT chat, not a voice call. Do NOT say things like "I heard your name as..." or "Did I hear that correctly?"
- The user can see exactly what they typed, so there is no need to repeat back or echo their input for confirmation.
- Do confirm important ACTIONS before executing them (e.g., "I'll go ahead and schedule your appointment for February 10th at 10:00 AM with Dr. Sharma. Shall I proceed?")
- But do NOT echo back names, dates, or phone numbers just to confirm you received them correctly — you're reading text, not listening to audio.
- Keep responses clear, concise, and well-formatted using short paragraphs.

## Important: You MUST Use Tools
- When a patient wants to book an appointment, USE the schedule_appointment tool
- When a patient asks about their appointments, USE the get_patient_appointments tool
- When a patient needs to find a doctor, USE the get_providers tool
- When looking up a patient, USE the lookup_patient or lookup_patient_by_phone tool
- ALWAYS use the appropriate tool to read from or write to the database

## Conversation Flow
1. If they want to book an appointment, ask which location they prefer
2. Ask for their name and date of birth for verification
3. Use lookup_patient to find them — do NOT repeat their info back before searching
4. Once patient is verified, proceed with their request
5. For scheduling actions, confirm the final details before executing

## New Patient Registration Flow
If lookup_patient returns "Patient not found":
1. Ask: "I don't see a record with that information. Are you a new patient with Marengo Asia Hospitals?"
2. If YES: Ask for phone number (and optionally email), then use create_new_patient
3. If NO: Ask them to double-check spelling or date of birth and try again

## Tool Usage Guidelines
- ALWAYS use tools when accessing patient data — never make up information
- After scheduling/canceling/rescheduling, confirm the action with the patient
- If a tool returns an error, explain the issue and offer alternatives
- Keep track of the patient_id once verified for subsequent tool calls

## Hospital Information
- Hospital: Marengo Asia Hospitals
- Toll-free (Faridabad): 1800-309-2222
- Toll-free (Gurugram): 1800-309-4444
- Toll-free (Ahmedabad/CIMS): 1800-309-9999
- Website: www.marengoasiahospitals.com
- Hours: Monday-Saturday 8AM-8PM, Sunday 9AM-2PM (Emergency: 24/7)
- All locations have 24/7 Emergency & Trauma services
"""


class ChatSession:
    """Session state for a chat conversation"""
    def __init__(self, session_id: str, patient_id: Optional[str] = None):
        self.session_id = session_id
        self.patient_id = patient_id
        self.patient_data: Optional[Dict] = None
        self.call_start = datetime.utcnow()
        self.call_log_id: Optional[str] = None
        self.transcript_messages: List[Dict] = []
        self.tools_used: List[str] = []
        self.appointment_id: Optional[str] = None
        self.agent_type: str = "chat"
        # OpenAI message history
        self.messages: List[Dict] = [
            {"role": "system", "content": CHAT_AGENT_INSTRUCTIONS}
        ]

    def add_transcript(self, role: str, text: str):
        if text and text.strip():
            self.transcript_messages.append({
                "role": role,
                "text": text.strip(),
                "timestamp": datetime.utcnow().isoformat()
            })

    def get_full_transcript(self) -> str:
        lines = []
        for msg in self.transcript_messages:
            role_label = "Patient" if msg["role"] == "user" else "Agent"
            lines.append(f"[{role_label}]: {msg['text']}")
        return "\n\n".join(lines)

    def get_call_summary(self) -> str:
        if not self.transcript_messages:
            return "No conversation recorded"
        user_messages = [m for m in self.transcript_messages if m["role"] == "user"]
        reason = user_messages[0]["text"][:200] if user_messages else "Chat session"
        tools_summary = ""
        if self.tools_used:
            unique_tools = list(set(self.tools_used))
            tools_summary = f" Actions taken: {', '.join(unique_tools)}."
        return f"{reason}{tools_summary}"


def create_chat_log_entry(session: ChatSession) -> Optional[str]:
    """Create a call log entry for chat session"""
    try:
        call_data = {
            "session_id": session.session_id,
            "direction": "inbound",
            "status": "in_progress",
            "agent_type": "chat",
            "started_at": session.call_start.isoformat(),
        }
        if session.patient_id:
            call_data["patient_id"] = session.patient_id
        result = queries.create_call_log(call_data)
        if result:
            return result.get("log_id")
        return None
    except Exception as e:
        logger.error(f"Error creating chat log: {e}")
        return None


def update_chat_log_entry(session: ChatSession, status: str = "completed"):
    """Update chat log when session ends"""
    if not session.call_log_id:
        return
    try:
        end_time = datetime.utcnow()
        duration = int((end_time - session.call_start).total_seconds())
        updates = {
            "status": status,
            "ended_at": end_time.isoformat(),
            "duration_seconds": duration,
            "transcript": session.get_full_transcript(),
            "call_summary": session.get_call_summary(),
        }
        if session.patient_id:
            updates["patient_id"] = session.patient_id
        if session.appointment_id:
            updates["appointment_id"] = session.appointment_id

        if "schedule_appointment" in session.tools_used:
            updates["resolution_status"] = "appointment_scheduled"
            updates["call_reason"] = "appointment_scheduling"
        elif "cancel_appointment" in session.tools_used:
            updates["resolution_status"] = "appointment_cancelled"
            updates["call_reason"] = "appointment_cancellation"
        elif "reschedule_appointment" in session.tools_used:
            updates["resolution_status"] = "appointment_rescheduled"
            updates["call_reason"] = "appointment_rescheduling"
        elif session.transcript_messages:
            updates["resolution_status"] = "completed"
            updates["call_reason"] = "general_inquiry"
        else:
            updates["resolution_status"] = "no_interaction"

        queries.update_call_log(session.call_log_id, updates)
    except Exception as e:
        logger.error(f"Error updating chat log: {e}")


def convert_tools_for_chat() -> List[Dict]:
    """Convert the voice tool definitions to OpenAI Chat function format"""
    tools = get_all_tools()
    chat_tools = []
    for tool in tools:
        chat_tools.append({
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool["description"],
                "parameters": tool["parameters"]
            }
        })
    return chat_tools


async def call_openai_chat(session: ChatSession) -> Dict:
    """Call OpenAI Chat Completions API"""
    chat_tools = convert_tools_for_chat()

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            OPENAI_CHAT_URL,
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": CHAT_MODEL,
                "messages": session.messages,
                "tools": chat_tools,
                "tool_choice": "auto",
                "temperature": 0.7
            }
        )
        response.raise_for_status()
        return response.json()


@router.websocket("/chat")
async def chat_websocket(
    websocket: WebSocket,
    patient_id: Optional[str] = Query(None)
):
    """WebSocket endpoint for text-based chat agent"""
    await websocket.accept()
    session_id = f"chat_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"
    session = ChatSession(session_id, patient_id)

    logger.info(f"Chat WebSocket connected: {session_id}")

    session.call_log_id = create_chat_log_entry(session)
    chat_status = "completed"

    try:
        # Send initial greeting
        greeting = "Welcome to Marengo Asia Hospitals! I'm your healthcare assistant. I can help you with scheduling appointments, finding doctors, checking appointment status, and more. How can I help you today?"
        session.messages.append({"role": "assistant", "content": greeting})
        session.add_transcript("assistant", greeting)

        await websocket.send_json({
            "type": "message",
            "role": "assistant",
            "text": greeting
        })

        # Main chat loop
        while True:
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                break

            msg_type = data.get("type", "message")

            if msg_type == "message":
                user_text = data.get("text", "").strip()
                if not user_text:
                    continue

                logger.info(f"User message: {user_text[:100]}")
                session.add_transcript("user", user_text)
                session.messages.append({"role": "user", "content": user_text})

                # Send typing indicator
                await websocket.send_json({"type": "typing", "typing": True})

                try:
                    # Call OpenAI and handle tool calls in a loop
                    max_iterations = 10
                    for _ in range(max_iterations):
                        result = await call_openai_chat(session)
                        choice = result["choices"][0]
                        message = choice["message"]

                        # Add assistant message to history
                        session.messages.append(message)

                        if message.get("tool_calls"):
                            # Execute each tool call
                            for tool_call in message["tool_calls"]:
                                func = tool_call["function"]
                                tool_name = func["name"]
                                try:
                                    arguments = json.loads(func["arguments"])
                                except json.JSONDecodeError:
                                    arguments = {}

                                logger.info(f"Executing tool: {tool_name}")
                                handler = TOOL_HANDLERS.get(tool_name)
                                if handler:
                                    tool_result = await handler(arguments, session)
                                    session.tools_used.append(tool_name)

                                    if tool_name == "schedule_appointment" and tool_result.get("success"):
                                        session.appointment_id = tool_result.get("appointment_id")
                                else:
                                    tool_result = {"error": f"Unknown tool: {tool_name}"}

                                # Add tool result to messages
                                session.messages.append({
                                    "role": "tool",
                                    "tool_call_id": tool_call["id"],
                                    "content": json.dumps(tool_result)
                                })

                                # Notify frontend about tool execution
                                await websocket.send_json({
                                    "type": "tool_executed",
                                    "tool": tool_name,
                                    "success": "error" not in tool_result
                                })

                            # Continue the loop to get the final response after tool calls
                            continue
                        else:
                            # No tool calls - send the text response
                            assistant_text = message.get("content", "")
                            if assistant_text:
                                session.add_transcript("assistant", assistant_text)
                                await websocket.send_json({
                                    "type": "message",
                                    "role": "assistant",
                                    "text": assistant_text
                                })
                            break

                except Exception as e:
                    logger.error(f"Chat error: {e}", exc_info=True)
                    await websocket.send_json({
                        "type": "error",
                        "error": "I'm sorry, I encountered an error. Please try again."
                    })
                finally:
                    await websocket.send_json({"type": "typing", "typing": False})

    except WebSocketDisconnect:
        logger.info(f"Chat disconnected: {session_id}")
    except Exception as e:
        logger.error(f"Chat WebSocket error: {e}", exc_info=True)
        chat_status = "failed"
    finally:
        update_chat_log_entry(session, chat_status)
        logger.info(f"Chat session ended: {session_id}")

        # Run AI analytics on the transcript
        if session.call_log_id and session.transcript_messages:
            try:
                from agents.analyze import analyze_session
                await analyze_session(session.call_log_id, session.get_full_transcript(), "chat")
            except Exception as e:
                logger.error(f"Error running chat analytics: {e}")
