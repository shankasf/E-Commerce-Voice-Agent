"""
URackIT AI Service - FastAPI Application

Main entry point for the AI service API.
Provides REST endpoints for chat, voice, and agent interactions.
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import get_config
from agents import Runner
from app_agents import triage_agent
from memory import get_memory, clear_memory

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="URackIT AI Service",
    description="AI-powered IT support agent service for URackIT",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
config = get_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",  # NestJS backend
        "http://localhost:5173",  # React frontend
        "http://localhost:8081",  # Local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Request/Response Models
# ============================================

class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str = Field(..., description="User message")
    session_id: Optional[str] = Field(None, description="Session ID for conversation continuity")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context (organization_id, contact_id, etc.)")


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    response: str = Field(..., description="AI response")
    session_id: str = Field(..., description="Session ID")
    agent_name: str = Field(..., description="Name of the agent that responded")
    tool_calls: List[Dict] = Field(default_factory=list, description="Tool calls made during processing")
    context: Dict[str, Any] = Field(default_factory=dict, description="Updated context")


class SessionRequest(BaseModel):
    """Request model for session operations."""
    session_id: str


class SessionContext(BaseModel):
    """Context to set for a session."""
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None
    contact_id: Optional[int] = None
    contact_name: Optional[str] = None
    phone_number: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    timestamp: str


# ============================================
# API Endpoints
# ============================================

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - health check."""
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        timestamp=datetime.utcnow().isoformat(),
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        timestamp=datetime.utcnow().isoformat(),
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a chat message through the AI agent pipeline.
    
    This is the main endpoint for text-based interactions with the AI.
    """
    # Generate or use provided session ID
    session_id = request.session_id or f"chat-{uuid.uuid4().hex[:8]}"
    
    # Get or create session memory
    memory = get_memory(session_id)
    
    # Merge provided context with existing
    context = memory.get_all_context()
    if request.context:
        context.update(request.context)
        for key, value in request.context.items():
            memory.set_context(key, value)
    
    # Get conversation history BEFORE adding current message
    # This gives us all previous turns (excluding the current message we're about to add)
    conversation_history = memory.get_messages_for_api(count=50)
    
    # Add user message to memory
    memory.add_turn("user", request.message)
    
    try:
        # Run the agent pipeline with conversation history
        result = await Runner.run(
            triage_agent,
            request.message,
            context=context,
            conversation_history=conversation_history,
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


@app.post("/api/chat/start")
async def start_session(session_id: Optional[str] = None):
    """
    Start a new chat session.
    Returns a new session ID and initial greeting.
    """
    session_id = session_id or f"chat-{uuid.uuid4().hex[:8]}"
    memory = get_memory(session_id)
    
    greeting = (
        "Thank you for reaching out to U Rack IT. I can help with email, computer, "
        "internet or VPN issues, printers, phones, security concerns, ticket updates, "
        "or billing. You may ask for a technician at any time. "
        "May I have your U E code please?"
    )
    
    memory.add_turn("assistant", greeting)
    
    return {
        "session_id": session_id,
        "greeting": greeting,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/session/context")
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


@app.get("/api/session/{session_id}")
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


@app.delete("/api/session/{session_id}")
async def end_session(session_id: str):
    """End and clear a session."""
    clear_memory(session_id)
    return {"status": "cleared", "session_id": session_id}


# ============================================
# WebSocket for Real-time Chat
# ============================================

@app.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time chat.
    Supports streaming responses.
    """
    await websocket.accept()
    memory = get_memory(session_id)
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            message = data.get("message", "")
            context = data.get("context", {})
            
            if not message:
                await websocket.send_json({"error": "Message required"})
                continue
            
            # Update context
            for key, value in context.items():
                memory.set_context(key, value)
            
            # Get conversation history BEFORE adding current message
            conversation_history = memory.get_messages_for_api(count=50)
            
            # Add user message
            memory.add_turn("user", message)
            
            try:
                # Run agent with conversation history
                result = await Runner.run(
                    triage_agent,
                    message,
                    context=memory.get_all_context(),
                    conversation_history=conversation_history,
                )
                
                # Add response
                memory.add_turn("assistant", result.final_output)
                
                # Send response
                await websocket.send_json({
                    "type": "response",
                    "response": result.final_output,
                    "agent_name": result.agent_name,
                    "tool_calls": result.tool_calls,
                    "context": memory.get_all_context(),
                })
            
            except Exception as e:
                logger.error(f"WebSocket agent error: {e}")
                await websocket.send_json({
                    "type": "error",
                    "error": str(e),
                })
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")


# ============================================
# Agent Management Endpoints
# ============================================

@app.get("/api/agents")
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


@app.get("/api/agents/{agent_name}/tools")
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

@app.get("/api/knowledge/stats")
async def knowledge_stats():
    """Get knowledge base statistics."""
    from memory.knowledge_base import get_knowledge_base_stats
    return get_knowledge_base_stats()


@app.post("/api/knowledge/reload")
async def reload_knowledge():
    """Reload the knowledge base from file."""
    from memory.knowledge_base import reload_knowledge_base
    result = reload_knowledge_base()
    return {"status": result}


@app.post("/api/knowledge/search")
async def search_knowledge(query: str, top_k: int = 4):
    """Search the knowledge base."""
    from memory.knowledge_base import lookup_support_info
    result = lookup_support_info(query, top_k)
    return {"query": query, "results": result}


# ============================================
# AI Task Endpoints (Called by NestJS Backend)
# ============================================

class SummarizeRequest(BaseModel):
    """Request to summarize a call transcript."""
    call_sid: str
    transcript: List[Dict[str, str]]
    metadata: Optional[Dict[str, Any]] = None


class SummarizeResponse(BaseModel):
    """Summary response."""
    summary: str
    key_points: List[str]
    action_items: List[str]
    sentiment: str
    resolution: str


@app.post("/api/summarize", response_model=SummarizeResponse)
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
        
        import json
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


class ClassifyRequest(BaseModel):
    """Request to classify an issue."""
    text: str
    context: Optional[Dict[str, Any]] = None


class ClassifyResponse(BaseModel):
    """Classification response."""
    category: str
    priority: str
    suggested_queue: str
    confidence: float


@app.post("/api/classify", response_model=ClassifyResponse)
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
        
        import json
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


# ============================================
# SIP/Voice Integration Routes
# ============================================

# Import and include SIP integration routes
try:
    from sip_integration.webhook_server import (
        create_app as create_sip_app,
    )
    from sip_integration.session_manager import init_session_manager, get_session_manager
    from sip_integration.config import get_config as get_sip_config
    from sip_integration.twilio_provider import create_twilio_provider
    from sip_integration.media_stream import MediaStreamHandler
    from sip_integration.interfaces import CallInfo, CallState
    import os
    from fastapi import Form, Request
    from fastapi.responses import Response, FileResponse
    from fastapi.staticfiles import StaticFiles
    from twilio.twiml.voice_response import VoiceResponse, Connect
    
    # Serve static files (dialer page)
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")
        logger.info(f"Static files mounted from {static_dir}")
    
    # Initialize SIP session manager on startup
    @app.on_event("startup")
    async def startup_sip():
        await init_session_manager()
        logger.info("SIP session manager initialized")
    
    @app.on_event("shutdown")
    async def shutdown_sip():
        session_manager = get_session_manager()
        await session_manager.stop()
        logger.info("SIP session manager stopped")
    
    @app.post("/twilio")
    async def twilio_webhook(
        request: Request,
        CallSid: str = Form(...),
        From: str = Form(...),
        To: str = Form(...),
        CallStatus: str = Form(None),
        Direction: str = Form(None),
    ):
        """Handle incoming Twilio voice webhooks."""
        logger.info(f"Incoming call: {CallSid} from {From} to {To}")
        
        session_manager = get_session_manager()
        sip_config = get_sip_config()
        
        call_info = CallInfo(
            call_sid=CallSid,
            from_number=From,
            to_number=To,
            direction=Direction or "inbound",
            status=CallStatus or "ringing",
        )
        
        # Standard Twilio PSTN call
        session_id = await session_manager.create_session(call_info, call_source="twilio")
        
        # Build WebSocket URL for media stream
        host = request.headers.get("host", "")
        scheme = "wss" if request.url.scheme == "https" else "ws"
        ws_url = f"{scheme}://{host}/media-stream/{session_id}"
        
        # If webhook base URL is configured, use it
        if sip_config.webhook_base_url:
            ws_url = f"{sip_config.webhook_base_url.replace('https', 'wss').replace('http', 'ws')}/media-stream/{session_id}"
        
        # Generate TwiML response
        response = VoiceResponse()
        connect = Connect()
        connect.stream(url=ws_url)
        response.append(connect)
        
        return Response(content=str(response), media_type="application/xml")
    
    @app.post("/twiml-app/voice")
    async def twiml_app_voice_webhook(request: Request):
        """
        TwiML Application webhook - handles browser calls from web dialer.
        
        When a browser client calls using device.connect():
        - Twilio sends: CallSid, From (client:identity), To (app:APxxx or phone number)
        - We connect the browser to the AI agent via WebSocket stream
        """
        sip_config = get_sip_config()
        session_manager = get_session_manager()
        
        # Get form data (Twilio sends call info here)
        try:
            form_data = await request.form()
            call_sid = form_data.get("CallSid", "")
            from_number = form_data.get("From", "")
            to_number = form_data.get("To", "")
            direction = form_data.get("Direction", "")
            caller_name = form_data.get("CallerName", "")
            account_sid = form_data.get("AccountSid", sip_config.twilio_account_sid)
        except:
            call_sid = ""
            from_number = ""
            to_number = ""
            direction = ""
            caller_name = ""
            account_sid = sip_config.twilio_account_sid
        
        logger.info(f"TwiML App webhook called:")
        logger.info(f"  CallSid: {call_sid}")
        logger.info(f"  From: {from_number}")
        logger.info(f"  To: {to_number}")
        logger.info(f"  Direction: {direction}")
        
        # Browser call (from client:xxx)
        if from_number.startswith("client:"):
            logger.info("📞 BROWSER CALL DETECTED - Connecting to AI agent (WebRTC source)")
            
            call_info = CallInfo(
                call_sid=call_sid,
                from_number=from_number,
                to_number=to_number or sip_config.twilio_phone_number,
                direction="inbound",
                status="ringing",
            )
            # Browser calls via Twilio Client SDK = still goes through Twilio,
            # but we track it as 'webrtc' since user is on browser
            # For truly direct WebRTC (no Twilio), use the /webrtc endpoint
            browser_session_id = await session_manager.create_session(call_info, call_source="webrtc")
            logger.info(f"Created browser WebRTC session: {browser_session_id}")
            
            # Build WebSocket URL
            ws_url = f"{sip_config.webhook_base_url.replace('https', 'wss').replace('http', 'ws')}/media-stream/{browser_session_id}"
            
            response = VoiceResponse()
            connect = Connect()
            connect.stream(url=ws_url)
            response.append(connect)
            
            logger.info(f"Browser client connecting to stream: {ws_url}")
            return Response(content=str(response), media_type="application/xml")
        
        # Outbound call to a phone number
        if to_number and not to_number.startswith("app:"):
            logger.info(f"📱 OUTBOUND CALL to {to_number}")
            
            response = VoiceResponse()
            response.dial(to_number, caller_id=sip_config.twilio_phone_number)
            
            return Response(content=str(response), media_type="application/xml")
        
        # Fallback - connect to AI agent
        logger.warning("TwiML App called with unknown parameters - connecting to AI")
        import uuid
        fallback_session_id = f"fallback-{uuid.uuid4().hex[:12]}"
        
        call_info = CallInfo(
            call_sid=call_sid or fallback_session_id,
            from_number=from_number or "unknown",
            to_number=to_number or sip_config.twilio_phone_number,
            direction="inbound",
            status="ringing",
        )
        # Twilio fallback call
        session_id = await session_manager.create_session(call_info, call_source="twilio")
        
        ws_url = f"{sip_config.webhook_base_url.replace('https', 'wss').replace('http', 'ws')}/media-stream/{session_id}"
        
        response = VoiceResponse()
        connect = Connect()
        connect.stream(url=ws_url)
        response.append(connect)
        
        return Response(content=str(response), media_type="application/xml")

    @app.websocket("/media-stream/{session_id}")
    async def media_stream_websocket(websocket: WebSocket, session_id: str):
        """Handle Twilio media stream WebSocket."""
        session_manager = get_session_manager()
        session = await session_manager.get_session(session_id)
        
        if not session:
            await websocket.close(code=4000)
            return
        
        handler = MediaStreamHandler(websocket, session)
        await handler.handle()
    
    @app.get("/voice-token")
    async def get_voice_token(identity: str = "web-user"):
        """Generate Twilio Voice token for browser calling."""
        from twilio.jwt.access_token import AccessToken
        from twilio.jwt.access_token.grants import VoiceGrant
        
        sip_config = get_sip_config()
        
        if not sip_config.twilio_api_key_sid or not sip_config.twilio_api_key_secret:
            raise HTTPException(status_code=500, detail="Twilio API keys not configured")
        
        token = AccessToken(
            sip_config.twilio_account_sid,
            sip_config.twilio_api_key_sid,
            sip_config.twilio_api_key_secret,
            identity=identity,
            ttl=3600,
        )
        
        voice_grant = VoiceGrant(
            outgoing_application_sid=sip_config.twilio_twiml_app_sid,
            incoming_allow=True,
        )
        token.add_grant(voice_grant)
        
        return {"token": token.to_jwt(), "identity": identity}
    
    @app.get("/dialer")
    async def get_dialer():
        """Serve the web dialer page."""
        dialer_path = os.path.join(static_dir, 'dialer.html')
        if os.path.exists(dialer_path):
            return FileResponse(dialer_path)
        raise HTTPException(status_code=404, detail="Dialer page not found")
    
    @app.get("/dashboard")
    async def get_dashboard():
        """Serve the analytics dashboard."""
        dashboard_path = os.path.join(static_dir, 'dashboard.html')
        if os.path.exists(dashboard_path):
            return FileResponse(dashboard_path)
        raise HTTPException(status_code=404, detail="Dashboard page not found")
    
    @app.get("/api/live-sessions")
    async def get_live_sessions():
        """Get all active live call sessions with their details."""
        import time
        from datetime import datetime
        
        session_manager = get_session_manager()
        sessions = session_manager.get_all_sessions()
        
        calls = []
        agents_set = set()
        total_duration = 0
        inbound_count = 0
        outbound_count = 0
        
        for session in sessions:
            duration = int(time.time() - session.created_at)
            total_duration += duration
            
            direction = session.call_info.direction or "inbound"
            if direction == "inbound":
                inbound_count += 1
            else:
                outbound_count += 1
            
            if session.agent_type:
                agents_set.add(session.agent_type)
            
            # Build transcript entries
            transcript = []
            for msg in session.conversation_history:
                transcript.append({
                    "role": msg.get("role", "assistant"),
                    "content": msg.get("content", ""),
                    "timestamp": msg.get("timestamp", datetime.utcnow().isoformat())
                })
            
            # Build agent history
            agent_history = []
            current_agent = session.agent_type or "triage_agent"
            agent_history.append({
                "agentName": current_agent,
                "action": "Started conversation",
                "timestamp": datetime.utcfromtimestamp(session.created_at).isoformat()
            })
            
            calls.append({
                "callSid": session.call_info.call_sid,
                "from": session.call_info.from_number,
                "to": session.call_info.to_number,
                "direction": direction,
                "status": "in-progress",
                "startTime": datetime.utcfromtimestamp(session.created_at).isoformat(),
                "duration": duration,
                "callerName": session.caller_name,
                "companyName": session.company_name,
                "currentAgent": current_agent,
                "transcript": transcript,
                "agentHistory": agent_history,
                "sentiment": "neutral",
                "ticketCreated": session.ticket_created,
                "escalated": session.escalated
            })
        
        # Calculate metrics
        avg_duration = total_duration // len(sessions) if sessions else 0
        
        return {
            "calls": calls,
            "metrics": {
                "activeCalls": len(sessions),
                "inbound": inbound_count,
                "outbound": outbound_count,
                "avgDuration": avg_duration,
                "activeAgents": list(agents_set)
            }
        }
    
    logger.info("SIP/Voice integration routes loaded")
    
except ImportError as e:
    logger.warning(f"SIP integration not available: {e}")


# ============================================
# WebRTC Direct Connection (Browser-to-AI)
# No Twilio involved - OpenAI costs only!
# ============================================

class WebRTCConnectRequest(BaseModel):
    """Request model for WebRTC connection - Unified Interface (backend proxies SDP)."""
    sdp: str = Field(..., description="WebRTC SDP offer from browser")
    role: str = Field(default="requester", description="User role: admin, agent, requester")
    maxDuration: Optional[int] = Field(default=15, description="Max call duration in minutes")
    userId: Optional[int] = Field(None, description="User ID from auth")
    userEmail: Optional[str] = Field(None, description="User email")


class WebRTCConnectResponse(BaseModel):
    """Response model for WebRTC connection - returns SDP answer from OpenAI."""
    sdp: str = Field(..., description="WebRTC SDP answer from OpenAI")
    sessionId: str = Field(..., description="Session ID for tracking the call")


@app.post("/webrtc/connect", response_model=WebRTCConnectResponse)
async def webrtc_connect(request: WebRTCConnectRequest):
    """
    Unified Interface: Backend proxies SDP to OpenAI Realtime API.
    
    Flow:
    1. Browser sends SDP offer to our backend
    2. Backend sends SDP to OpenAI /v1/realtime endpoint
    3. Backend returns SDP answer to browser
    4. Browser sets remote description and connects
    
    Role-based access:
    - admin: Full access, 60 min max, all agents
    - agent: Standard access, 30 min max, assigned agents  
    - requester: Limited access, 15 min max, triage only
    """
    import aiohttp
    import os
    import uuid
    
    try:
        from sip_integration.session_manager import get_session_manager
        from sip_integration.interfaces import CallInfo
        
        session_manager = get_session_manager()
        
        # Create a WebRTC session for tracking
        webrtc_id = f"webrtc-{uuid.uuid4().hex[:12]}"
        
        call_info = CallInfo(
            call_sid=webrtc_id,
            from_number=f"webrtc:{request.userEmail or 'anonymous'}",
            to_number="ai-agent",
            direction="inbound",
            status="ringing",
        )
        
        # Create session with webrtc source
        session_id = await session_manager.create_session(call_info, call_source="webrtc")
        
        # Get the session and set metadata
        session = await session_manager.get_session(session_id)
        if session:
            session.metadata['role'] = request.role
            session.metadata['maxDuration'] = request.maxDuration
            session.metadata['userId'] = request.userId
            session.metadata['userEmail'] = request.userEmail
            session.metadata['webrtc'] = True
        
        # Get OpenAI API key
        openai_api_key = os.getenv("OPENAI_API_KEY")
        realtime_model = os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview-2024-12-17")
        
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        # OpenAI Realtime API - POST SDP offer, get SDP answer
        async with aiohttp.ClientSession() as http_session:
            sdp_response = await http_session.post(
                f"https://api.openai.com/v1/realtime?model={realtime_model}",
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/sdp",
                },
                data=request.sdp,
            )

            if sdp_response.status != 200 and sdp_response.status != 201:
                error_text = await sdp_response.text()
                logger.error(f"OpenAI SDP error ({sdp_response.status}): {error_text}")
                raise HTTPException(status_code=502, detail=f"OpenAI error: {error_text}")

            sdp_answer = await sdp_response.text()
        
        logger.info(f"WebRTC session created: {session_id}, role={request.role}")
        
        return WebRTCConnectResponse(
            sdp=sdp_answer,
            sessionId=session_id,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"WebRTC connect error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def get_system_prompt_for_role(role: str) -> str:
    """Get appropriate system prompt based on user role."""
    if role == "admin":
        return """You are an AI assistant for U Rack IT, a full-service IT support company. 
        The user is an administrator with full access. Help them with any IT-related questions, 
        system management, or support tasks. Be professional and thorough."""
    elif role == "agent":
        return """You are an AI assistant for U Rack IT, a full-service IT support company.
        The user is a support agent. Help them handle customer inquiries, troubleshoot issues,
        and manage support tickets efficiently."""
    else:
        return """You are a friendly AI support assistant for U Rack IT.
        Help the user with their IT support needs. Be helpful, patient, and clear.
        If you cannot resolve their issue, offer to create a support ticket or escalate to a human agent."""


@app.post("/webrtc/disconnect")
async def webrtc_disconnect(payload: dict = Body(...)):
    """Disconnect a WebRTC session."""
    try:
        from sip_integration.session_manager import get_session_manager
        
        session_id = payload.get("sessionId") or payload.get("session_id")
        if not session_id:
            raise HTTPException(status_code=422, detail="Missing sessionId")

        session_manager = get_session_manager()
        await session_manager.end_session(session_id)
        
        logger.info(f"WebRTC session disconnected: {session_id}")
        return {"success": True, "sessionId": session_id}
        
    except Exception as e:
        logger.error(f"WebRTC disconnect error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Main Entry Point
# ============================================

def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    return app


if __name__ == "__main__":
    import uvicorn
    from port_utils import find_available_port
    
    config = get_config()
    errors = config.validate()
    
    if errors:
        for error in errors:
            logger.error(f"Configuration error: {error}")
        logger.info("Please set the required environment variables in .env file")
        exit(1)
    
    preferred_port = config.port
    
    try:
        port = find_available_port(preferred_port)
        
        if port != preferred_port:
            print(f"⚠️  Preferred port {preferred_port} was in use, using port {port} instead")
        
        logger.info("=" * 60)
        logger.info("URackIT AI Service v2.0.0")
        logger.info("=" * 60)
        logger.info(f"Host: {config.host}")
        logger.info(f"Port: {port}")
        logger.info(f"OpenAI Model: {config.openai_model}")
        logger.info("=" * 60)
        
        uvicorn.run(
            "main:app",
            host=config.host,
            port=port,
            reload=config.debug,
        )
    except RuntimeError as e:
        logger.error(f"Failed to start server: {e}")
        exit(1)
