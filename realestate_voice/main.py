"""
Real Estate Property Management Voice Agent

Main entry point for the FastAPI application with Twilio integration.
Uses xAI Grok Voice Agent API for real-time voice conversations.
"""

import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict, Optional

import uvicorn
from fastapi import FastAPI, Form, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from twilio.twiml.voice_response import VoiceResponse, Connect

from config import get_config
from xai_integration import (
    XAIRealtimeConnection,
    SessionManager,
    VoiceSession,
    get_session_manager,
    MediaStreamHandler,
)
from xai_integration.session_manager import CallInfo, init_session_manager, SessionState
from agents import get_triage_agent_config
from db.queries import (
    find_tenant_by_phone,
    get_tenant_details,
    get_rent_balance,
    get_lease_info,
    create_maintenance_request,
    get_maintenance_status,
    update_maintenance_request,
    get_available_units,
    get_property_info,
    get_office_info,
    record_payment,
    create_tenant,
    log_call_start,
    log_call_end,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


# Function handlers for xAI tool calls
FUNCTION_HANDLERS = {
    "find_tenant_by_phone": find_tenant_by_phone,
    "get_tenant_details": get_tenant_details,
    "get_rent_balance": get_rent_balance,
    "get_lease_info": get_lease_info,
    "create_maintenance_request": create_maintenance_request,
    "get_maintenance_status": get_maintenance_status,
    "update_maintenance_request": update_maintenance_request,
    "get_available_units": get_available_units,
    "get_property_info": get_property_info,
    "get_office_info": get_office_info,
    "record_payment": record_payment,
    "create_tenant": create_tenant,
}


async def handle_function_call(
    function_name: str,
    call_id: str,
    arguments: Dict[str, Any],
    session: VoiceSession
) -> Any:
    """Handle a function call from xAI."""
    logger.info(f"Function call: {function_name} with args: {arguments}")
    
    if function_name not in FUNCTION_HANDLERS:
        return {"error": f"Unknown function: {function_name}"}
    
    try:
        handler = FUNCTION_HANDLERS[function_name]
        result = handler(**arguments)
        
        # Log tool call
        session.add_tool_call(function_name, arguments, result, success=True)
        
        # Update session context based on function results
        if function_name == "find_tenant_by_phone" and "tenant_id:" in str(result):
            # Extract tenant_id from result
            for line in str(result).split('\n'):
                if "tenant_id:" in line:
                    try:
                        tenant_id = int(line.split(':')[1].strip())
                        session.tenant_id = tenant_id
                    except:
                        pass
                if "Name:" in line:
                    session.tenant_name = line.split(':')[1].strip()
        
        return result
        
    except Exception as e:
        logger.error(f"Error executing {function_name}: {e}")
        session.add_tool_call(function_name, arguments, str(e), success=False)
        return {"error": str(e)}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("=" * 60)
    logger.info("Real Estate Property Management Voice Agent")
    logger.info("=" * 60)
    
    config = get_config()
    
    # Validate configuration
    errors = config.validate()
    if errors:
        for error in errors:
            logger.warning(f"Configuration warning: {error}")
    
    # Initialize session manager
    await init_session_manager(config.max_concurrent_sessions)
    
    logger.info(f"Server: {config.host}:{config.port}")
    logger.info(f"xAI Voice: {config.xai_voice}")
    logger.info(f"Max Sessions: {config.max_concurrent_sessions}")
    
    if config.webhook_base_url:
        logger.info(f"Webhook URL: {config.webhook_base_url}/twilio")
    
    logger.info("=" * 60)
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    session_manager = get_session_manager()
    await session_manager.stop()
    logger.info("Server stopped")


# Create FastAPI application
app = FastAPI(
    title="Real Estate Voice Agent",
    description="AI-powered voice assistant for property management using xAI Grok",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
static_dir = os.path.join(os.path.dirname(__file__), 'static')
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Active WebRTC voice sessions
webrtc_voice_sessions: Dict[str, Dict[str, Any]] = {}


# ============================================
# WebRTC Voice Endpoints (xAI Grok)
# ============================================

@app.post("/api/voice/webrtc/connect")
async def webrtc_voice_connect(request: Request):
    """
    WebRTC voice connection endpoint.
    Since xAI uses WebSocket-based realtime API (not WebRTC),
    we proxy through OpenAI Realtime API for browser WebRTC support.
    For true xAI integration, use the Twilio + WebSocket path.
    """
    import uuid
    import httpx
    
    data = await request.json()
    sdp = data.get("sdp")
    provider = data.get("provider", "openai")
    
    if not sdp:
        raise HTTPException(status_code=400, detail="SDP offer is required")
    
    config = get_config()
    session_id = str(uuid.uuid4())
    
    # For WebRTC browser calls, use OpenAI Realtime API
    # xAI Grok Voice uses WebSocket, not WebRTC
    openai_key = os.environ.get("OPENAI_API_KEY")
    
    if not openai_key:
        raise HTTPException(
            status_code=500, 
            detail="OPENAI_API_KEY not configured for WebRTC. Use Twilio for xAI Grok."
        )
    
    try:
        model = os.environ.get("OPENAI_VOICE_MODEL", "gpt-4o-realtime-preview-2024-12-17")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.openai.com/v1/realtime?model={model}",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/sdp",
                },
                content=sdp,
                timeout=30.0
            )
        
        if response.status_code != 200:
            logger.error(f"OpenAI Realtime API error: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to connect: {response.text}"
            )
        
        answer_sdp = response.text
        
        webrtc_voice_sessions[session_id] = {
            "provider": "openai",
            "start_time": datetime.now().isoformat(),
        }
        
        logger.info(f"WebRTC voice session {session_id} created")
        
        return {
            "sdp": answer_sdp,
            "sessionId": session_id,
            "provider": "openai",
            "note": "Using OpenAI for WebRTC. For xAI Grok, use Twilio integration."
        }
        
    except httpx.RequestError as e:
        logger.error(f"WebRTC connect error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/voice/webrtc/disconnect")
async def webrtc_voice_disconnect(request: Request):
    """Disconnect WebRTC voice session."""
    data = await request.json()
    session_id = data.get("sessionId")
    
    if session_id and session_id in webrtc_voice_sessions:
        del webrtc_voice_sessions[session_id]
        logger.info(f"WebRTC voice session {session_id} disconnected")
    
    return {"success": True, "sessionId": session_id}


@app.get("/api/voice/webrtc/sessions")
async def webrtc_voice_sessions_list():
    """List active WebRTC voice sessions."""
    sessions = []
    for sid, session in webrtc_voice_sessions.items():
        sessions.append({
            "sessionId": sid,
            "provider": session.get("provider"),
            "startTime": session.get("start_time"),
        })
    return {"count": len(sessions), "sessions": sessions}


# ============================================
# Web Dialer Endpoints
# ============================================

@app.get("/dialer")
async def get_dialer():
    """Serve the web dialer page."""
    dialer_path = os.path.join(static_dir, 'dialer.html')
    if os.path.exists(dialer_path):
        return FileResponse(dialer_path)
    raise HTTPException(status_code=404, detail="Dialer page not found")


@app.get("/dialer-config")
async def get_dialer_config():
    """
    Get dialer configuration including Twilio phone number if configured.
    This allows the dialer to optionally call a Twilio number or connect directly to AI agent.
    """
    config = get_config()
    
    # Return Twilio phone number if configured, otherwise return empty
    # When empty, dialer will use direct WebRTC connection to AI agent
    twilio_number = config.twilio_phone_number if config.twilio_phone_number else ""
    
    return {
        "twilio_phone_number": twilio_number,
        "use_phone_number": bool(twilio_number),
        "agent_identifier": "property-management-ai",
        "service_name": "Real Estate Property Management"
    }


@app.get("/voice-token")
async def get_voice_token(identity: str = "web-user"):
    """
    Generate an access token for the Twilio Voice JavaScript SDK.
    This allows browser-based calling without a Twilio phone number.
    """
    from twilio.jwt.access_token import AccessToken
    from twilio.jwt.access_token.grants import VoiceGrant
    
    config = get_config()
    
    # Check if API keys are configured
    if not config.twilio_api_key_sid or not config.twilio_api_key_secret:
        raise HTTPException(
            status_code=500,
            detail="TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET must be configured in .env"
        )
    
    if not config.twilio_twiml_app_sid:
        raise HTTPException(
            status_code=500,
            detail="TWILIO_TWIML_APP_SID must be configured in .env"
        )
    
    # Create access token with Voice grant
    token = AccessToken(
        config.twilio_account_sid,
        config.twilio_api_key_sid,
        config.twilio_api_key_secret,
        identity=identity,
        ttl=3600  # Token valid for 1 hour
    )
    
    # Create Voice grant - allows outgoing calls via TwiML App
    voice_grant = VoiceGrant(
        outgoing_application_sid=config.twilio_twiml_app_sid,
        incoming_allow=True  # Allow incoming calls to this identity
    )
    token.add_grant(voice_grant)
    
    logger.info(f"Generated voice token for identity: {identity}")
    
    return {
        "token": token.to_jwt(),
        "identity": identity,
        "expires_in": 3600
    }


@app.post("/twilio/voice-app")
async def twilio_voice_app_webhook(
    request: Request,
    CallSid: str = Form(...),
    From: str = Form(default=""),
    To: str = Form(default=""),
    Direction: str = Form(default="outbound-api"),
):
    """
    TwiML App webhook for web dialer calls.
    This is called when a browser client initiates a call via the Twilio Voice SDK.
    """
    config = get_config()
    
    logger.info(f"Web dialer call: {CallSid} from {From} to {To}")
    
    # Create call info
    call_info = CallInfo(
        call_sid=CallSid,
        from_number=From or "web-dialer",
        to_number=To,
        direction=Direction,
    )
    
    # Create session
    session_manager = get_session_manager()
    session = await session_manager.create_session(call_info)
    
    if not session:
        response = VoiceResponse()
        response.say("We're experiencing high call volume. Please try again later.")
        response.hangup()
        return Response(content=str(response), media_type="application/xml")
    
    # Build WebSocket URL
    if config.webhook_base_url:
        ws_url = config.webhook_base_url.replace("https://", "wss://").replace("http://", "ws://")
        ws_url = f"{ws_url}/twilio/ws/{CallSid}"
    else:
        host = request.headers.get("host", f"localhost:{config.port}")
        ws_url = f"wss://{host}/twilio/ws/{CallSid}"
    
    # Create TwiML response with Stream
    response = VoiceResponse()
    connect = Connect()
    connect.stream(url=ws_url)
    response.append(connect)
    
    logger.info(f"Connecting web dialer call {CallSid} to WebSocket: {ws_url}")
    
    return Response(content=str(response), media_type="application/xml")


# ============================================
# Health Check Endpoints
# ============================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Real Estate Voice Agent",
        "version": "1.0.0",
        "engine": "xAI Grok Voice"
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    config = get_config()
    session_manager = get_session_manager()
    
    return {
        "status": "healthy",
        "active_sessions": session_manager.active_session_count,
        "max_sessions": config.max_concurrent_sessions,
        "xai_configured": bool(config.xai_api_key),
        "database_configured": bool(config.supabase_url)
    }


# ============================================
# Twilio Webhook Endpoints
# ============================================

@app.post("/twilio")
async def twilio_voice_webhook(
    request: Request,
    CallSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(...),
    Direction: str = Form(default="inbound"),
    AccountSid: str = Form(default=None),
    CallerCity: str = Form(default=None),
    CallerState: str = Form(default=None),
    CallerCountry: str = Form(default=None),
):
    """Handle incoming Twilio voice webhook."""
    config = get_config()
    
    logger.info(f"Incoming call: {CallSid} from {From} to {To}")
    
    # Create call info
    call_info = CallInfo(
        call_sid=CallSid,
        from_number=From,
        to_number=To,
        direction=Direction,
        account_sid=AccountSid,
        caller_city=CallerCity,
        caller_state=CallerState,
        caller_country=CallerCountry
    )
    
    # Create session
    session_manager = get_session_manager()
    session = await session_manager.create_session(call_info)
    
    if not session:
        # Too many sessions
        response = VoiceResponse()
        response.say("We're experiencing high call volume. Please try again later.")
        response.hangup()
        return Response(content=str(response), media_type="application/xml")
    
    # Log call start
    try:
        log_call_start(
            call_sid=CallSid,
            session_id=session.session_id,
            phone_from=From,
            phone_to=To,
            direction=Direction
        )
    except Exception as e:
        logger.error(f"Error logging call start: {e}")
    
    # Build WebSocket URL
    if config.webhook_base_url:
        ws_url = config.webhook_base_url.replace("https://", "wss://").replace("http://", "ws://")
        ws_url = f"{ws_url}/twilio/ws/{CallSid}"
    else:
        # Get from request
        host = request.headers.get("host", f"localhost:{config.port}")
        ws_url = f"wss://{host}/twilio/ws/{CallSid}"
    
    # Create TwiML response with Stream
    response = VoiceResponse()
    
    # Start the media stream
    connect = Connect()
    connect.stream(url=ws_url)
    response.append(connect)
    
    logger.info(f"Connecting call {CallSid} to WebSocket: {ws_url}")
    
    return Response(content=str(response), media_type="application/xml")


@app.websocket("/twilio/ws/{call_sid}")
async def twilio_websocket(websocket: WebSocket, call_sid: str):
    """Handle Twilio media stream WebSocket."""
    await websocket.accept()
    
    config = get_config()
    session_manager = get_session_manager()
    
    # Get session
    session = session_manager.get_session_by_call_sid(call_sid)
    if not session:
        logger.error(f"No session found for call {call_sid}")
        await websocket.close()
        return
    
    logger.info(f"WebSocket connected for call {call_sid}")
    
    try:
        # Get agent configuration
        agent_config = get_triage_agent_config()
        session.agent_type = "triage_agent"
        
        # Create xAI connection
        xai_connection = XAIRealtimeConnection(
            api_key=config.xai_api_key,
            system_prompt=agent_config["system_prompt"],
            voice=config.xai_voice,
            tools=agent_config["tools"],
            input_audio_format=config.input_audio_format,
            output_audio_format=config.output_audio_format,
            sample_rate=config.sample_rate
        )
        
        # Store connection in session
        session.xai_connection = xai_connection
        
        # Set up function call handler
        async def function_handler(name: str, call_id: str, args: Dict[str, Any]) -> Any:
            return await handle_function_call(name, call_id, args, session)
        
        xai_connection.on_function_call(function_handler)
        
        # Connect to xAI
        connected = await xai_connection.connect(session.session_id)
        if not connected:
            logger.error("Failed to connect to xAI")
            await websocket.close()
            return
        
        session.state = SessionState.CONNECTED
        
        # Create media stream handler
        media_handler = MediaStreamHandler(
            session=session,
            twilio_ws=websocket,
            xai_connection=xai_connection
        )
        
        # Handle media stream
        await media_handler.start()
        
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for call {call_sid}")
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {e}")
    finally:
        # Clean up session
        session = await session_manager.end_session_by_call_sid(call_sid)
        if session:
            # Log call end
            try:
                transcript = "\n".join([
                    f"{msg['role']}: {msg['content']}"
                    for msg in session.conversation_history
                ])
                log_call_end(
                    call_sid=call_sid,
                    duration_seconds=session.get_duration(),
                    agent_type=session.agent_type,
                    transcript=transcript
                )
            except Exception as e:
                logger.error(f"Error logging call end: {e}")
        
        logger.info(f"Session ended for call {call_sid}")


@app.post("/twilio/status")
async def twilio_status_callback(
    CallSid: str = Form(...),
    CallStatus: str = Form(...),
    CallDuration: str = Form(default="0"),
):
    """Handle Twilio call status callbacks."""
    logger.info(f"Call {CallSid} status: {CallStatus}, duration: {CallDuration}s")
    
    if CallStatus in ("completed", "failed", "busy", "no-answer"):
        session_manager = get_session_manager()
        await session_manager.end_session_by_call_sid(CallSid)
    
    return {"status": "ok"}


# ============================================
# Dashboard & API Endpoints
# ============================================

@app.get("/dashboard")
async def dashboard():
    """Serve the analytics dashboard."""
    dashboard_path = os.path.join(static_dir, 'dashboard.html')
    if os.path.exists(dashboard_path):
        return FileResponse(dashboard_path)
    
    # Return simple inline dashboard if file doesn't exist
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Real Estate Voice Agent Dashboard</title>
        <style>
            body { font-family: system-ui, sans-serif; padding: 20px; background: #f5f5f5; }
            .card { background: white; padding: 20px; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { color: #333; }
            .stat { font-size: 2em; color: #2563eb; font-weight: bold; }
        </style>
    </head>
    <body>
        <h1>🏠 Real Estate Voice Agent Dashboard</h1>
        <div class="card">
            <h3>Active Calls</h3>
            <div class="stat" id="active-calls">Loading...</div>
        </div>
        <div class="card">
            <h3>Server Status</h3>
            <div id="status">Checking...</div>
        </div>
        <script>
            async function refresh() {
                try {
                    const res = await fetch('/api/live-sessions');
                    const data = await res.json();
                    document.getElementById('active-calls').textContent = data.summary?.totalCalls || 0;
                    document.getElementById('status').textContent = '✓ Connected to xAI Voice API';
                } catch (e) {
                    document.getElementById('status').textContent = '✗ Error: ' + e.message;
                }
            }
            refresh();
            setInterval(refresh, 5000);
        </script>
    </body>
    </html>
    """)


@app.get("/api/live-sessions")
async def get_live_sessions():
    """Get all active voice sessions."""
    session_manager = get_session_manager()
    sessions = session_manager.get_all_sessions()
    
    calls = []
    for session in sessions:
        calls.append({
            "sessionId": session.session_id,
            "callSid": session.call_info.call_sid,
            "from": session.call_info.from_number,
            "to": session.call_info.to_number,
            "direction": session.call_info.direction,
            "status": session.state.value,
            "tenantName": session.tenant_name,
            "agentType": session.agent_type,
            "duration": session.get_duration(),
            "startedAt": datetime.utcfromtimestamp(session.created_at).isoformat(),
            "transcriptLength": len(session.conversation_history),
            "toolCallCount": len(session.tool_calls)
        })
    
    return {
        "calls": calls,
        "summary": {
            "totalCalls": len(calls),
            "totalDuration": sum(c["duration"] for c in calls)
        }
    }


@app.get("/api/session/{session_id}")
async def get_session_details(session_id: str):
    """Get detailed information about a session."""
    session_manager = get_session_manager()
    session = session_manager.get_session(session_id)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "sessionId": session.session_id,
        "callInfo": {
            "callSid": session.call_info.call_sid,
            "from": session.call_info.from_number,
            "to": session.call_info.to_number,
            "direction": session.call_info.direction,
            "city": session.call_info.caller_city,
            "state": session.call_info.caller_state,
        },
        "status": session.state.value,
        "tenantId": session.tenant_id,
        "tenantName": session.tenant_name,
        "propertyName": session.property_name,
        "agentType": session.agent_type,
        "duration": session.get_duration(),
        "transcript": session.conversation_history,
        "toolCalls": session.tool_calls,
        "metrics": {
            "audioPacketsSent": session.audio_packets_sent,
            "audioPacketsReceived": session.audio_packets_received
        }
    }


# ============================================
# Main Entry Point
# ============================================

def main():
    """Run the application with dynamic port allocation."""
    from port_utils import find_available_port
    
    config = get_config()
    preferred_port = config.port
    
    try:
        port = find_available_port(preferred_port)
        
        if port != preferred_port:
            print(f"⚠️  Preferred port {preferred_port} was in use, using port {port} instead")
            config.port = port
        
        uvicorn.run(
            "main:app",
            host=config.host,
            port=port,
            reload=config.debug,
            log_level="info"
        )
    except RuntimeError as e:
        print(f"Failed to start server: {e}")
        exit(1)


if __name__ == "__main__":
    main()
