"""
URackIT AI Service - FastAPI Application

Main entry point for the AI service API.
Provides REST endpoints for chat, voice, and agent interactions.
"""

import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Body, Form, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles

from config import get_config
from api import api_router
from api.schemas import WebRTCConnectRequest, WebRTCConnectResponse

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
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router)


# ============================================
# WebSocket Endpoints
# ============================================

def get_client_ip(websocket: WebSocket) -> str:
    """Extract client IP from WebSocket connection."""
    forwarded = websocket.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = websocket.headers.get("x-real-ip")
    if real_ip:
        return real_ip

    if websocket.client:
        return websocket.client.host

    return "unknown"


@app.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time chat."""
    from agents import Runner
    from app_agents import triage_agent
    from memory import get_memory

    await websocket.accept()
    memory = get_memory(session_id)

    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")
            context = data.get("context", {})

            if not message:
                await websocket.send_json({"error": "Message required"})
                continue

            for key, value in context.items():
                memory.set_context(key, value)

            memory.add_turn("user", message)

            try:
                result = await Runner.run(
                    triage_agent,
                    message,
                    context=memory.get_all_context(),
                    memory=memory,
                )

                memory.add_turn("assistant", result.final_output)

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


@app.websocket("/ws/device")
async def websocket_device(websocket: WebSocket):
    """WebSocket endpoint for Windows device connections."""
    from websocket.device_handler import handle_device_websocket
    client_ip = get_client_ip(websocket)
    await handle_device_websocket(websocket, client_ip)


# ============================================
# SIP/Voice Integration Routes
# ============================================

try:
    from sip_integration.webhook_server import create_app as create_sip_app
    from sip_integration.session_manager import init_session_manager, get_session_manager
    from sip_integration.config import get_config as get_sip_config
    from sip_integration.twilio_provider import create_twilio_provider
    from sip_integration.media_stream import MediaStreamHandler
    from sip_integration.interfaces import CallInfo, CallState
    from twilio.twiml.voice_response import VoiceResponse, Connect

    # Serve static files
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")
        logger.info(f"Static files mounted from {static_dir}")

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

        session_id = await session_manager.create_session(call_info, call_source="twilio")

        host = request.headers.get("host", "")
        scheme = "wss" if request.url.scheme == "https" else "ws"
        ws_url = f"{scheme}://{host}/media-stream/{session_id}"

        if sip_config.webhook_base_url:
            ws_url = f"{sip_config.webhook_base_url.replace('https', 'wss').replace('http', 'ws')}/media-stream/{session_id}"

        response = VoiceResponse()
        connect = Connect()
        connect.stream(url=ws_url)
        response.append(connect)

        return Response(content=str(response), media_type="application/xml")

    @app.post("/twiml-app/voice")
    async def twiml_app_voice_webhook(request: Request):
        """TwiML Application webhook - handles browser calls from web dialer."""
        import uuid as uuid_mod
        sip_config = get_sip_config()
        session_manager = get_session_manager()

        try:
            form_data = await request.form()
            call_sid = form_data.get("CallSid", "")
            from_number = form_data.get("From", "")
            to_number = form_data.get("To", "")
            direction = form_data.get("Direction", "")
        except:
            call_sid = ""
            from_number = ""
            to_number = ""
            direction = ""

        logger.info(f"TwiML App webhook: CallSid={call_sid}, From={from_number}, To={to_number}")

        if from_number.startswith("client:"):
            logger.info("Browser call detected - Connecting to AI agent")

            call_info = CallInfo(
                call_sid=call_sid,
                from_number=from_number,
                to_number=to_number or sip_config.twilio_phone_number,
                direction="inbound",
                status="ringing",
            )
            browser_session_id = await session_manager.create_session(call_info, call_source="webrtc")

            ws_url = f"{sip_config.webhook_base_url.replace('https', 'wss').replace('http', 'ws')}/media-stream/{browser_session_id}"

            response = VoiceResponse()
            connect = Connect()
            connect.stream(url=ws_url)
            response.append(connect)

            return Response(content=str(response), media_type="application/xml")

        if to_number and not to_number.startswith("app:"):
            logger.info(f"Outbound call to {to_number}")

            response = VoiceResponse()
            response.dial(to_number, caller_id=sip_config.twilio_phone_number)

            return Response(content=str(response), media_type="application/xml")

        # Fallback
        fallback_session_id = f"fallback-{uuid_mod.uuid4().hex[:12]}"

        call_info = CallInfo(
            call_sid=call_sid or fallback_session_id,
            from_number=from_number or "unknown",
            to_number=to_number or sip_config.twilio_phone_number,
            direction="inbound",
            status="ringing",
        )
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

            transcript = []
            for msg in session.conversation_history:
                transcript.append({
                    "role": msg.get("role", "assistant"),
                    "content": msg.get("content", ""),
                    "timestamp": msg.get("timestamp", datetime.utcnow().isoformat())
                })

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
# WebRTC Direct Connection
# ============================================

@app.post("/webrtc/connect", response_model=WebRTCConnectResponse)
async def webrtc_connect(request: WebRTCConnectRequest):
    """
    Unified Interface: Backend proxies SDP to OpenAI Realtime API.
    """
    import aiohttp
    import uuid as uuid_mod

    try:
        from sip_integration.session_manager import get_session_manager
        from sip_integration.interfaces import CallInfo

        session_manager = get_session_manager()

        webrtc_id = f"webrtc-{uuid_mod.uuid4().hex[:12]}"

        call_info = CallInfo(
            call_sid=webrtc_id,
            from_number=f"webrtc:{request.userEmail or 'anonymous'}",
            to_number="ai-agent",
            direction="inbound",
            status="ringing",
        )

        session_id = await session_manager.create_session(call_info, call_source="webrtc")

        session = await session_manager.get_session(session_id)
        if session:
            session.metadata['role'] = request.role
            session.metadata['maxDuration'] = request.maxDuration
            session.metadata['userId'] = request.userId
            session.metadata['userEmail'] = request.userEmail
            session.metadata['webrtc'] = True

        openai_api_key = os.getenv("OPENAI_API_KEY")
        realtime_model = os.getenv("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview-2024-12-17")

        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")

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
    from utils.port import find_available_port

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
            print(f"Preferred port {preferred_port} was in use, using port {port} instead")

        logger.info("=" * 60)
        logger.info("URackIT AI Service v2.0.0")
        logger.info("=" * 60)
        logger.info(f"Host: {config.host}")
        logger.info(f"Port: {port}")
        logger.info(f"OpenAI Model: {config.openai_model}")

        uvicorn_kwargs = {
            "host": config.host,
            "port": port,
            "reload": config.debug,
        }

        uvicorn.run("main:app", **uvicorn_kwargs)
    except RuntimeError as e:
        logger.error(f"Failed to start server: {e}")
        exit(1)
