"""
API routes for URackIT AI Service.

Contains all HTTP REST endpoints.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException

from agents import Runner
from app_agents import triage_agent
from config import get_config
from memory import get_memory, clear_memory, get_user_sessions

from .schemas import (
    ChatRequest,
    ChatResponse,
    SessionContext,
    HealthResponse,
    SummarizeRequest,
    SummarizeResponse,
    ClassifyRequest,
    ClassifyResponse,
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


# ============================================
# Health Check Endpoints
# ============================================

@router.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - health check."""
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        timestamp=datetime.utcnow().isoformat(),
    )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        timestamp=datetime.utcnow().isoformat(),
    )


# ============================================
# Chat Endpoints
# ============================================

@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a chat message through the AI agent pipeline.

    This is the main endpoint for text-based interactions with the AI.
    """
    # Generate or use provided session ID
    session_id = request.session_id or f"chat-{uuid.uuid4().hex[:8]}"

    # Get or create session memory
    memory = get_memory(session_id)

    # Store session_id in context so AI can use it for device connections
    memory.set_context("session_id", session_id)
    memory.set_context("chat_session_id", session_id)

    # Merge provided context with existing
    context = memory.get_all_context()
    if request.context:
        context.update(request.context)
        for key, value in request.context.items():
            memory.set_context(key, value)

    # Add user message to memory
    memory.add_turn("user", request.message)

    try:
        # Run the agent pipeline with memory for conversation history
        result = await Runner.run(
            triage_agent,
            request.message,
            context=context,
            memory=memory,
        )

        # Add assistant response to memory
        memory.add_turn("assistant", result.final_output)

        return ChatResponse(
            response=result.final_output,
            session_id=session_id,
            agent_name=result.agent_name,
            tool_calls=result.tool_calls,
            context=memory.get_all_context(),
        )

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/chat/start")
async def start_session(context: Optional[Dict[str, Any]] = None):
    """
    Start a new chat session.
    Returns a new session ID and initial greeting.
    """
    session_id = f"chat-{uuid.uuid4().hex[:8]}"
    memory = get_memory(session_id)

    # Store context if provided
    if context:
        for key, value in context.items():
            memory.set_context(key, value)

    greeting = (
        "Thank you for calling U Rack IT. I can help with email, computer, "
        "internet or VPN issues, printers, phones, security concerns, ticket updates, "
        "or billing. You may ask for a technician at any time. "
        "May I have your U E code please?"
    )

    memory.add_turn("assistant", greeting)

    return {
        "session_id": session_id,
        "greeting": greeting,
        "timestamp": datetime.utcnow().isoformat(),
        "agent_name": "Triage Agent",
        "context": memory.get_all_context(),
    }


# ============================================
# Session Management Endpoints
# ============================================

@router.post("/api/session/context")
async def set_session_context(session_id: str, context: SessionContext):
    """
    Set context for an existing session.
    Used to pre-populate organization/contact info.
    """
    memory = get_memory(session_id)

    if context.organization_id:
        memory.set_context("organization_id", context.organization_id)
    if context.organization_name:
        memory.set_context("organization_name", context.organization_name)
    if context.contact_id:
        memory.set_context("contact_id", context.contact_id)
    if context.contact_name:
        memory.set_context("contact_name", context.contact_name)
    if context.phone_number:
        memory.set_context("phone_number", context.phone_number)

    return {
        "session_id": session_id,
        "context": memory.get_all_context(),
    }


@router.get("/api/session/{session_id}")
async def get_session(session_id: str):
    """Get session information and history."""
    memory = get_memory(session_id)

    return {
        "session_id": session_id,
        "context": memory.get_all_context(),
        "summary": memory.get_summary(),
        "turn_count": len(memory.turns),
        "messages": memory.get_messages_for_api(20),
    }


@router.delete("/api/session/{session_id}")
async def end_session(session_id: str):
    """End and clear a session."""
    clear_memory(session_id)
    return {"status": "cleared", "session_id": session_id}


@router.get("/api/user-sessions/{user_id}")
async def get_sessions_for_user(user_id: int):
    """
    Get all sessions for a specific user.
    Returns list of sessions with metadata and previews.
    """
    try:
        sessions = get_user_sessions(user_id)
        return {
            "success": True,
            "sessions": sessions,
            "count": len(sessions),
        }
    except Exception as e:
        logger.error(f"Error fetching user sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Device Connection Endpoints
# ============================================

@router.get("/api/device-connections/active")
async def get_active_device_connections():
    """Get count of active device WebSocket connections."""
    from websocket.device_handler import device_connection_manager
    return {
        "active_connections": device_connection_manager.get_active_count(),
        "connection_ids": list(device_connection_manager.get_all_sessions()),
    }


@router.get("/api/device-connections/{connection_id}")
async def get_device_connection_details(connection_id: str):
    """Get details of a specific device connection."""
    from websocket.device_handler import device_connection_manager

    handler = device_connection_manager.get(connection_id)
    if not handler:
        raise HTTPException(status_code=404, detail="Connection not found")

    return {
        "connection_id": connection_id,
        "device_id": handler.device_id,
        "user_id": handler.user_id,
        "organization_id": handler.organization_id,
        "chat_session_id": handler.chat_session_id,
        "is_authenticated": handler.is_authenticated,
        "last_heartbeat": handler.last_heartbeat.isoformat(),
    }


@router.get("/api/commands/info")
async def get_commands_info():
    """
    Get information about command execution.

    Note: With the new classic approach, the AI sends actual PowerShell commands
    directly to devices. Command tracking is handled per-connection in device_websocket.
    """
    return {
        "message": "Commands are now executed directly via PowerShell",
        "approach": "classic",
        "description": "AI agent decides what PowerShell commands to run based on troubleshooting context"
    }


# ============================================
# Agent Management Endpoints
# ============================================

@router.get("/api/agents")
async def list_agents():
    """List available agents."""
    from app_agents import (
        triage_agent, device_agent, ticket_agent, email_agent,
        computer_agent, network_agent, printer_agent, phone_agent,
        security_agent, lookup_agent
    )

    agents = [
        triage_agent, device_agent, ticket_agent, email_agent,
        computer_agent, network_agent, printer_agent, phone_agent,
        security_agent, lookup_agent
    ]

    return {
        "agents": [
            {
                "name": agent.name,
                "tool_count": len(agent.tools),
                "handoff_count": len(agent.handoffs),
            }
            for agent in agents
        ]
    }


@router.get("/api/agents/{agent_name}/tools")
async def get_agent_tools(agent_name: str):
    """Get tools available to a specific agent."""
    from app_agents import (
        triage_agent, device_agent, ticket_agent, email_agent,
        computer_agent, network_agent, printer_agent, phone_agent,
        security_agent, lookup_agent
    )

    agent_map = {
        "URackIT_TriageAgent": triage_agent,
        "URackIT_DeviceAgent": device_agent,
        "URackIT_TicketAgent": ticket_agent,
        "URackIT_EmailAgent": email_agent,
        "URackIT_ComputerAgent": computer_agent,
        "URackIT_NetworkAgent": network_agent,
        "URackIT_PrinterAgent": printer_agent,
        "URackIT_PhoneAgent": phone_agent,
        "URackIT_SecurityAgent": security_agent,
        "URackIT_LookupAgent": lookup_agent,
    }

    agent = agent_map.get(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_name}")

    return {
        "agent_name": agent.name,
        "tools": [
            {
                "name": tool.name if hasattr(tool, "name") else tool.__name__,
                "description": tool.description if hasattr(tool, "description") else (tool.__doc__ or ""),
            }
            for tool in agent.tools
        ]
    }


# ============================================
# Knowledge Base Endpoints
# ============================================

@router.get("/api/knowledge/stats")
async def knowledge_stats():
    """Get knowledge base statistics."""
    from tools.knowledge import get_knowledge_base_stats
    return get_knowledge_base_stats()


@router.post("/api/knowledge/reload")
async def reload_knowledge():
    """Reload the knowledge base from file."""
    from tools.knowledge import reload_knowledge_base
    result = reload_knowledge_base()
    return {"status": result}


@router.post("/api/knowledge/search")
async def search_knowledge(query: str, top_k: int = 4):
    """Search the knowledge base."""
    from tools.knowledge import lookup_support_info
    result = lookup_support_info(query, top_k)
    return {"query": query, "results": result}


# ============================================
# AI Task Endpoints (Called by NestJS Backend)
# ============================================

@router.post("/api/summarize", response_model=SummarizeResponse)
async def summarize_call(request: SummarizeRequest):
    """
    Summarize a call transcript.
    Called by NestJS backend after call ends.
    """
    import openai

    config = get_config()
    client = openai.OpenAI(api_key=config.openai_api_key)

    # Format transcript
    transcript_text = "\n".join([
        f"{msg.get('role', 'unknown')}: {msg.get('content', '')}"
        for msg in request.transcript
    ])

    prompt = f"""Analyze this IT support call transcript and provide:
1. A brief summary (2-3 sentences)
2. Key points discussed (bullet list)
3. Action items if any
4. Overall sentiment (positive/neutral/negative)
5. Resolution status (resolved/escalated/pending)

Transcript:
{transcript_text}

Respond in JSON format:
{{
  "summary": "...",
  "key_points": ["...", "..."],
  "action_items": ["...", "..."],
  "sentiment": "positive|neutral|negative",
  "resolution": "resolved|escalated|pending"
}}"""

    try:
        response = client.chat.completions.create(
            model=config.openai_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        return SummarizeResponse(
            summary=result.get("summary", ""),
            key_points=result.get("key_points", []),
            action_items=result.get("action_items", []),
            sentiment=result.get("sentiment", "neutral"),
            resolution=result.get("resolution", "pending"),
        )
    except Exception as e:
        logger.error(f"Summarization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


@router.post("/api/classify", response_model=ClassifyResponse)
async def classify_issue(request: ClassifyRequest):
    """
    Classify an issue for ticket routing.
    Returns category, priority, and suggested queue.
    """
    import openai

    config = get_config()
    client = openai.OpenAI(api_key=config.openai_api_key)

    prompt = f"""Classify this IT support issue:

Issue: {request.text}

Categories: email, computer, network, printer, phone, security, billing, other
Priorities: low, medium, high, critical
Queues: email_support, desktop_support, network_ops, device_support, security_team, billing, general

Respond in JSON:
{{
  "category": "...",
  "priority": "low|medium|high|critical",
  "suggested_queue": "...",
  "confidence": 0.0-1.0
}}"""

    try:
        response = client.chat.completions.create(
            model=config.openai_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        return ClassifyResponse(
            category=result.get("category", "other"),
            priority=result.get("priority", "medium"),
            suggested_queue=result.get("suggested_queue", "general"),
            confidence=float(result.get("confidence", 0.8)),
        )
    except Exception as e:
        logger.error(f"Classification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")
