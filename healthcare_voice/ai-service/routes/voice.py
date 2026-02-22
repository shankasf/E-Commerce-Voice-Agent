"""Voice WebSocket route for OpenAI Realtime API integration with tool handling and call logging"""
import json
import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import websockets

from config import settings
from agents.definitions.head_agent import get_all_tools, HEAD_AGENT_INSTRUCTIONS
from agents.tools import TOOL_HANDLERS
from db import queries

logger = logging.getLogger(__name__)
router = APIRouter()

OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime"


class VoiceSession:
    """Session state for a voice call with call logging"""
    def __init__(self, session_id: str, patient_id: Optional[str] = None):
        self.session_id = session_id
        self.patient_id = patient_id
        self.patient_data: Optional[Dict] = None
        self.call_start = datetime.utcnow()
        self.call_log_id: Optional[str] = None
        self.transcript_messages: List[Dict] = []
        self.tools_used: List[str] = []
        self.appointment_id: Optional[str] = None
        self.agent_type: str = "voice"

    def add_transcript(self, role: str, text: str):
        """Add a transcript message"""
        if text and text.strip():
            self.transcript_messages.append({
                "role": role,
                "text": text.strip(),
                "timestamp": datetime.utcnow().isoformat()
            })

    def get_full_transcript(self) -> str:
        """Get the full transcript as a formatted string"""
        lines = []
        for msg in self.transcript_messages:
            role_label = "Patient" if msg["role"] == "user" else "Agent"
            lines.append(f"[{role_label}]: {msg['text']}")
        return "\n\n".join(lines)

    def get_call_summary(self) -> str:
        """Generate a brief call summary"""
        if not self.transcript_messages:
            return "No conversation recorded"

        # Get first user message as potential reason
        user_messages = [m for m in self.transcript_messages if m["role"] == "user"]
        reason = user_messages[0]["text"][:200] if user_messages else "Voice call"

        # List tools used
        tools_summary = ""
        if self.tools_used:
            unique_tools = list(set(self.tools_used))
            tools_summary = f" Actions taken: {', '.join(unique_tools)}."

        return f"{reason}{tools_summary}"


def create_call_log_entry(session: VoiceSession) -> Optional[str]:
    """Create a call log entry when session starts"""
    try:
        call_data = {
            "session_id": session.session_id,
            "direction": "inbound",
            "status": "in_progress",
            "agent_type": "voice_webrtc",
            "started_at": session.call_start.isoformat(),
        }

        if session.patient_id:
            call_data["patient_id"] = session.patient_id

        result = queries.create_call_log(call_data)
        if result:
            logger.info(f"Created call log: {result.get('log_id')}")
            return result.get("log_id")
        else:
            logger.error("Failed to create call log - no result returned")
            return None
    except Exception as e:
        logger.error(f"Error creating call log: {e}", exc_info=True)
        return None


def update_call_log_entry(session: VoiceSession, status: str = "completed"):
    """Update call log when session ends"""
    if not session.call_log_id:
        logger.warning("No call log ID to update")
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

        # Add patient ID if identified during call
        if session.patient_id:
            updates["patient_id"] = session.patient_id

        # Add appointment ID if one was created/modified
        if session.appointment_id:
            updates["appointment_id"] = session.appointment_id

        # Determine resolution status based on tools used
        if "schedule_appointment" in session.tools_used:
            updates["resolution_status"] = "appointment_scheduled"
            updates["call_reason"] = "appointment_scheduling"
        elif "cancel_appointment" in session.tools_used:
            updates["resolution_status"] = "appointment_cancelled"
            updates["call_reason"] = "appointment_cancellation"
        elif "reschedule_appointment" in session.tools_used:
            updates["resolution_status"] = "appointment_rescheduled"
            updates["call_reason"] = "appointment_rescheduling"
        elif "get_patient_appointments" in session.tools_used:
            updates["resolution_status"] = "information_provided"
            updates["call_reason"] = "appointment_inquiry"
        elif "lookup_patient" in session.tools_used or "lookup_patient_by_phone" in session.tools_used:
            updates["resolution_status"] = "information_provided"
            updates["call_reason"] = "general_inquiry"
        elif session.transcript_messages:
            updates["resolution_status"] = "completed"
            updates["call_reason"] = "general_inquiry"
        else:
            updates["resolution_status"] = "no_interaction"

        result = queries.update_call_log(session.call_log_id, updates)
        if result:
            logger.info(f"Updated call log {session.call_log_id}: status={status}, duration={duration}s")
        else:
            logger.error(f"Failed to update call log {session.call_log_id}")
    except Exception as e:
        logger.error(f"Error updating call log: {e}", exc_info=True)


async def execute_tool(tool_name: str, arguments: Dict[str, Any], session: VoiceSession) -> Dict[str, Any]:
    """Execute a tool and return the result"""
    logger.info(f"Executing tool: {tool_name} with args: {arguments}")

    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        logger.error(f"Unknown tool: {tool_name}")
        return {"error": f"Unknown tool: {tool_name}"}

    try:
        result = await handler(arguments, session)
        logger.info(f"Tool {tool_name} result: {result}")

        # Track tool usage
        session.tools_used.append(tool_name)

        # Track appointment ID if one was created
        if tool_name == "schedule_appointment" and result.get("success"):
            session.appointment_id = result.get("appointment_id")

        return result
    except Exception as e:
        logger.error(f"Tool {tool_name} error: {e}", exc_info=True)
        return {"error": str(e)}


@router.websocket("/voice")
async def voice_websocket(
    websocket: WebSocket,
    patient_id: Optional[str] = Query(None)
):
    """WebSocket endpoint for browser-based voice agent with tool handling and call logging."""
    await websocket.accept()
    session_id = f"voice_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"
    session = VoiceSession(session_id, patient_id)

    logger.info(f"Voice WebSocket connected: {session_id}")

    # Create call log entry
    session.call_log_id = create_call_log_entry(session)

    call_status = "completed"  # Default status

    try:
        # Connect to OpenAI Realtime API
        openai_ws_url = f"{OPENAI_REALTIME_URL}?model={settings.openai_model}"
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "OpenAI-Beta": "realtime=v1"
        }

        logger.info(f"Connecting to OpenAI: {openai_ws_url}")

        async with websockets.connect(
            openai_ws_url,
            extra_headers=headers,
            ping_interval=20,
            ping_timeout=20
        ) as openai_ws:
            logger.info(f"Connected to OpenAI Realtime API")

            # Wait for session.created
            session_created = await openai_ws.recv()
            logger.info(f"Session created: {session_created[:200]}")

            # Get all tools for the session
            all_tools = get_all_tools()
            logger.info(f"Configured {len(all_tools)} tools for the session")

            # Configure the session with tools
            session_config = {
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": HEAD_AGENT_INSTRUCTIONS,
                    "voice": settings.openai_voice,
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16",
                    "input_audio_transcription": {
                        "model": "whisper-1"
                    },
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.6,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 800
                    },
                    "tools": all_tools,
                    "tool_choice": "auto",
                    "temperature": 0.8
                }
            }

            await openai_ws.send(json.dumps(session_config))
            logger.info("Session config with tools sent")

            # Wait for session.updated
            session_updated = await openai_ws.recv()
            logger.info(f"Session updated: {session_updated[:200]}")

            # Notify browser that OpenAI session is ready
            await websocket.send_json({"type": "ready"})
            logger.info("Sent ready message to browser")

            # Wait for browser to finish audio setup before greeting
            logger.info("Waiting for browser audio setup...")
            while True:
                start_msg = await websocket.receive()
                if start_msg.get("type") == "websocket.disconnect":
                    logger.info("Browser disconnected before start")
                    return
                if "text" in start_msg:
                    start_data = json.loads(start_msg["text"])
                    if start_data.get("type") == "start":
                        logger.info("Browser audio ready, triggering greeting")
                        break

            # Trigger proactive greeting
            initial_greeting = {
                "type": "response.create",
                "response": {
                    "modalities": ["text", "audio"],
                    "instructions": "Greet the caller warmly and introduce yourself as a healthcare assistant from Marengo Asia Hospitals. Say 'Welcome to Marengo Asia Hospitals! I'm your healthcare assistant. How can I help you today?' Keep it brief and natural."
                }
            }
            await openai_ws.send(json.dumps(initial_greeting))
            logger.info("Triggered proactive greeting")

            # Create tasks for bidirectional communication
            audio_chunk_count = 0
            pending_tool_calls = {}
            current_response_item_id = None
            current_audio_content_index = 0
            audio_samples_played = 0

            async def browser_to_openai():
                """Relay audio from browser to OpenAI"""
                nonlocal audio_chunk_count
                try:
                    while True:
                        message = await websocket.receive()

                        if message.get("type") == "websocket.disconnect":
                            logger.info("Browser disconnected")
                            break

                        if "text" in message:
                            data = json.loads(message["text"])
                            msg_type = data.get("type")

                            if msg_type == "audio":
                                audio_chunk_count += 1
                                audio_data = data.get("audio")
                                if audio_chunk_count <= 5 or audio_chunk_count % 100 == 0:
                                    logger.info(f"Audio chunk {audio_chunk_count}: {len(audio_data) if audio_data else 0} bytes")
                                # Forward audio to OpenAI
                                audio_event = {
                                    "type": "input_audio_buffer.append",
                                    "audio": audio_data
                                }
                                await openai_ws.send(json.dumps(audio_event))

                except WebSocketDisconnect:
                    logger.info("Browser WebSocket disconnected")
                except Exception as e:
                    logger.error(f"Browser to OpenAI error: {e}")

            async def openai_to_browser():
                """Relay responses from OpenAI to browser and handle tool calls"""
                nonlocal pending_tool_calls, current_response_item_id, current_audio_content_index
                try:
                    async for message in openai_ws:
                        data = json.loads(message)
                        event_type = data.get("type")

                        # Log important events
                        if event_type not in ["response.audio.delta"]:
                            logger.info(f"OpenAI event: {event_type}")

                        if event_type == "response.audio.delta":
                            # Track the item ID for truncation on interruption
                            if data.get("item_id"):
                                current_response_item_id = data["item_id"]
                            if data.get("content_index") is not None:
                                current_audio_content_index = data["content_index"]
                            # Send audio chunk to browser
                            await websocket.send_json({
                                "type": "audio",
                                "audio": data.get("delta")
                            })

                        elif event_type == "response.audio_transcript.delta":
                            await websocket.send_json({
                                "type": "transcript",
                                "role": "assistant",
                                "text": data.get("delta", "")
                            })

                        elif event_type == "response.audio_transcript.done":
                            transcript_text = data.get("transcript", "")
                            session.add_transcript("assistant", transcript_text)
                            await websocket.send_json({
                                "type": "transcript_done",
                                "role": "assistant",
                                "text": transcript_text
                            })

                        elif event_type == "conversation.item.input_audio_transcription.completed":
                            transcript_text = data.get("transcript", "")
                            session.add_transcript("user", transcript_text)
                            await websocket.send_json({
                                "type": "transcript_done",
                                "role": "user",
                                "text": transcript_text
                            })

                        elif event_type == "response.function_call_arguments.delta":
                            # Accumulate function call arguments
                            call_id = data.get("call_id")
                            if call_id not in pending_tool_calls:
                                pending_tool_calls[call_id] = {
                                    "name": data.get("name"),
                                    "arguments": ""
                                }
                            pending_tool_calls[call_id]["arguments"] += data.get("delta", "")

                        elif event_type == "response.function_call_arguments.done":
                            # Execute the tool
                            call_id = data.get("call_id")
                            tool_name = data.get("name")
                            arguments_str = data.get("arguments", "{}")

                            logger.info(f"Function call complete: {tool_name} with args: {arguments_str}")

                            try:
                                arguments = json.loads(arguments_str)
                            except json.JSONDecodeError:
                                arguments = {}

                            # Execute the tool handler
                            result = await execute_tool(tool_name, arguments, session)

                            # Send the tool result back to OpenAI
                            tool_response = {
                                "type": "conversation.item.create",
                                "item": {
                                    "type": "function_call_output",
                                    "call_id": call_id,
                                    "output": json.dumps(result)
                                }
                            }
                            await openai_ws.send(json.dumps(tool_response))
                            logger.info(f"Sent tool result for {tool_name}")

                            # Trigger a response to continue the conversation
                            continue_response = {
                                "type": "response.create"
                            }
                            await openai_ws.send(json.dumps(continue_response))
                            logger.info("Triggered continuation after tool call")

                            # Clean up pending call
                            if call_id in pending_tool_calls:
                                del pending_tool_calls[call_id]

                            # Notify browser about tool execution
                            await websocket.send_json({
                                "type": "tool_executed",
                                "tool": tool_name,
                                "success": "error" not in result
                            })

                        elif event_type == "response.done":
                            await websocket.send_json({"type": "response_done"})

                        elif event_type == "error":
                            error_msg = data.get("error", {})
                            error_message = error_msg.get("message", str(error_msg))
                            # Don't forward cancellation errors (benign with server_vad)
                            if "cancellation" in error_message.lower() or "no active response" in error_message.lower():
                                logger.info(f"Ignoring benign error: {error_message}")
                            else:
                                logger.error(f"OpenAI error: {error_msg}")
                                await websocket.send_json({
                                    "type": "error",
                                    "error": error_message
                                })

                        elif event_type == "input_audio_buffer.speech_started":
                            logger.info("Speech started - clearing browser audio")
                            # With server_vad, OpenAI auto-cancels the response.
                            # We just need to tell the browser to stop playing queued audio.
                            await websocket.send_json({
                                "type": "interrupt"
                            })
                            current_response_item_id = None

                        elif event_type == "input_audio_buffer.speech_stopped":
                            logger.info("Speech stopped")

                except Exception as e:
                    logger.error(f"OpenAI to browser error: {e}", exc_info=True)

            # Run both tasks
            browser_task = asyncio.create_task(browser_to_openai())
            openai_task = asyncio.create_task(openai_to_browser())

            done, pending = await asyncio.wait(
                [browser_task, openai_task],
                return_when=asyncio.FIRST_COMPLETED
            )

            for task in pending:
                task.cancel()

    except WebSocketDisconnect:
        logger.info(f"Browser disconnected: {session_id}")
        call_status = "completed"
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}", exc_info=True)
        call_status = "failed"
    finally:
        # Update call log with final status
        update_call_log_entry(session, call_status)
        logger.info(f"Voice session ended: {session_id}, status: {call_status}")

        # Run AI analytics on the transcript
        if session.call_log_id and session.transcript_messages:
            try:
                from agents.analyze import analyze_session
                await analyze_session(session.call_log_id, session.get_full_transcript(), "voice")
            except Exception as e:
                logger.error(f"Error running session analytics: {e}")


@router.get("/health")
async def health():
    return {"status": "healthy", "tools_loaded": len(get_all_tools())}
