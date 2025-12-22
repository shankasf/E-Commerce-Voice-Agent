"""
FastAPI webhook server for Twilio SIP integration.

Follows Single Responsibility - handles only HTTP/WebSocket endpoints.
"""

import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, Form, Header, HTTPException, Request, WebSocket, status
from fastapi.responses import Response

from .config import get_config, SIPConfig
from .twilio_provider import TwilioProvider, create_twilio_provider
from .session_manager import get_session_manager, init_session_manager, VoiceSession
from .media_stream import MediaStreamHandler
from .interfaces import CallInfo

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup
    logger.info("Starting SIP Integration Server...")
    
    # Initialize session manager
    await init_session_manager()
    
    # Validate configuration
    config = get_config()
    errors = config.validate()
    if errors:
        logger.warning(f"Configuration warnings: {errors}")
    
    logger.info("SIP Integration Server started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down SIP Integration Server...")
    session_manager = get_session_manager()
    await session_manager.stop()
    logger.info("SIP Integration Server stopped")


def create_app(config: SIPConfig = None) -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Args:
        config: Optional custom configuration
        
    Returns:
        Configured FastAPI application
    """
    if config:
        from .config import set_config
        set_config(config)
    
    app = FastAPI(
        title="Toy Shop Voice Agent",
        description="SIP/Voice integration for multi-agent chatbot",
        version="1.0.0",
        lifespan=lifespan
    )
    
    # Create Twilio provider
    twilio_provider = create_twilio_provider()
    
    @app.get("/")
    async def root():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "service": "Toy Shop Voice Agent",
            "version": "1.0.0"
        }
    
    @app.get("/health")
    async def health_check():
        """Detailed health check."""
        session_manager = get_session_manager()
        return {
            "status": "healthy",
            "active_sessions": session_manager.active_session_count,
            "max_sessions": get_config().max_concurrent_sessions
        }
    
    @app.post("/twilio")
    async def handle_incoming_call(
        request: Request,
        CallSid: Annotated[str, Form()],
        From: Annotated[str, Form()] = "",
        To: Annotated[str, Form()] = "",
        Direction: Annotated[str, Form()] = "inbound",
        AccountSid: Annotated[str, Form()] = "",
        CallerName: Annotated[str | None, Form()] = None,
        CallerCity: Annotated[str | None, Form()] = None,
        CallerState: Annotated[str | None, Form()] = None,
        CallerZip: Annotated[str | None, Form()] = None,
        CallerCountry: Annotated[str | None, Form()] = None,
        x_twilio_signature: Annotated[str | None, Header()] = None,
    ):
        """
        Webhook endpoint for incoming Twilio calls.
        
        This is called when someone calls the Twilio phone number.
        Returns TwiML to connect the call to a media stream.
        """
        logger.info(f"Incoming call: {CallSid} from {From} to {To}")
        
        # Validate request signature (optional in development)
        config = get_config()
        if config.twilio_auth_token and x_twilio_signature:
            # Build full URL for validation
            full_url = str(request.url)
            form_data = await request.form()
            params = {k: v for k, v in form_data.items()}
            
            is_valid = await twilio_provider.validate_request(
                full_url, params, x_twilio_signature
            )
            if not is_valid:
                logger.warning("Invalid Twilio signature")
                raise HTTPException(status_code=403, detail="Invalid signature")
        
        # Create call info
        call_info = CallInfo(
            call_sid=CallSid,
            from_number=From,
            to_number=To,
            direction=Direction,
            account_sid=AccountSid,
            caller_name=CallerName,
            caller_city=CallerCity,
            caller_state=CallerState,
            caller_zip=CallerZip,
            caller_country=CallerCountry,
        )
        
        # Create session
        session_manager = get_session_manager()
        try:
            session_id = await session_manager.create_session(call_info)
        except RuntimeError as e:
            logger.error(f"Failed to create session: {e}")
            # Return busy signal
            return Response(
                content=twilio_provider.generate_say_response(
                    "We're sorry, all agents are busy. Please call back later."
                ),
                media_type="application/xml"
            )
        
        # Build WebSocket URL for media stream
        # Use the configured base URL or construct from request
        base_url = config.webhook_base_url
        if not base_url:
            # Construct from request (may not work behind proxies without proper headers)
            scheme = "wss" if request.url.scheme == "https" else "ws"
            base_url = f"{scheme}://{request.url.netloc}"
        else:
            # Convert http(s) to ws(s)
            base_url = base_url.replace("https://", "wss://").replace("http://", "ws://")
        
        stream_url = f"{base_url}/media-stream/{session_id}"
        
        logger.info(f"Connecting call to stream: {stream_url}")
        
        # Generate TwiML to connect to media stream
        twiml = twilio_provider.generate_connect_response(stream_url, call_info)
        
        return Response(content=twiml, media_type="application/xml")
    
    @app.post("/twilio/status")
    async def handle_call_status(
        CallSid: Annotated[str, Form()],
        CallStatus: Annotated[str, Form()],
        CallDuration: Annotated[str | None, Form()] = None,
    ):
        """
        Webhook for call status updates from Twilio.
        
        Called when call state changes (ringing, in-progress, completed, etc.)
        """
        logger.info(f"Call status update: {CallSid} -> {CallStatus}")
        
        # Find and update session
        session_manager = get_session_manager()
        session = await session_manager.get_session_by_call_sid(CallSid)
        
        if session and CallStatus in ("completed", "failed", "busy", "no-answer", "canceled"):
            await session_manager.end_session(session.session_id)
        
        return {"status": "received"}
    
    @app.websocket("/media-stream/{session_id}")
    async def media_stream_websocket(websocket: WebSocket, session_id: str):
        """
        WebSocket endpoint for Twilio media stream.
        
        Handles bidirectional audio streaming between Twilio and OpenAI.
        """
        logger.info(f"Media stream WebSocket connection for session: {session_id}")
        
        # Get session
        session_manager = get_session_manager()
        session = await session_manager.get_session(session_id)
        
        if not session:
            logger.error(f"Session not found: {session_id}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Create and run media stream handler
        handler = MediaStreamHandler(websocket, session)
        await handler.handle()
    
    @app.get("/sessions")
    async def list_sessions():
        """List all active sessions (for monitoring/debugging)."""
        session_manager = get_session_manager()
        sessions = await session_manager.get_all_sessions()
        
        return {
            "count": len(sessions),
            "sessions": [
                {
                    "session_id": s.session_id,
                    "call_sid": s.call_info.call_sid,
                    "from": s.call_info.from_number,
                    "state": s.state.value,
                    "created_at": s.created_at,
                    "last_activity": s.last_activity,
                }
                for s in sessions
            ]
        }
    
    return app


# Create default app instance
app = create_app()
