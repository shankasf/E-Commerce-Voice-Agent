"""
FastAPI webhook server for Twilio SIP integration.

Handles HTTP/WebSocket endpoints for U Rack IT voice support.
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, Form, Header, HTTPException, Request, WebSocket, status
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles

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
    logger.info("Starting U Rack IT Voice Server...")
    
    # Initialize session manager
    await init_session_manager()
    
    # Validate configuration
    config = get_config()
    errors = config.validate()
    if errors:
        logger.warning(f"Configuration warnings: {errors}")
    
    logger.info("U Rack IT Voice Server started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down U Rack IT Voice Server...")
    session_manager = get_session_manager()
    await session_manager.stop()
    logger.info("U Rack IT Voice Server stopped")


def create_app(config: SIPConfig = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    if config:
        from .config import set_config
        set_config(config)
    
    app = FastAPI(
        title="U Rack IT Voice Agent",
        description="SIP/Voice integration for IT support chatbot",
        version="1.0.0",
        lifespan=lifespan
    )
    
    # Create Twilio provider
    twilio_provider = create_twilio_provider()
    
    # Serve static files (dialer page)
    static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
    if os.path.exists(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")
    
    @app.get("/dialer")
    async def get_dialer():
        """Serve the web dialer page."""
        dialer_path = os.path.join(static_dir, 'dialer.html')
        if os.path.exists(dialer_path):
            return FileResponse(dialer_path)
        raise HTTPException(status_code=404, detail="Dialer page not found")
    
    @app.get("/")
    async def root():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "service": "U Rack IT Voice Agent",
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
    
    @app.get("/voice-token")
    async def get_voice_token(identity: str = "web-user"):
        """
        Generate an access token for the Twilio Voice JavaScript SDK.
        This allows browser-based calling.
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
            twiml = twilio_provider.generate_say_response(
                "We're sorry, all support lines are currently busy. Please try again in a few minutes.",
                voice="Polly.Joanna"
            )
            return Response(content=twiml, media_type="application/xml")
        
        # Build WebSocket URL for media stream
        base_url = config.webhook_base_url
        if not base_url:
            # Use request URL as base
            host = request.headers.get("host", "localhost:8080")
            scheme = "wss" if request.url.scheme == "https" else "ws"
            base_url = f"{scheme}://{host}"
        else:
            base_url = base_url.replace("https://", "wss://").replace("http://", "ws://")
        
        stream_url = f"{base_url}/media-stream/{session_id}"
        
        # Generate TwiML response
        twiml = twilio_provider.generate_connect_response(stream_url, call_info)
        
        logger.info(f"Connecting call {CallSid} to stream {stream_url}")
        return Response(content=twiml, media_type="application/xml")
    
    @app.websocket("/media-stream/{session_id}")
    async def handle_media_stream(websocket: WebSocket, session_id: str):
        """
        WebSocket endpoint for Twilio media stream.
        
        Handles bidirectional audio streaming with OpenAI Realtime API.
        """
        logger.info(f"Media stream connection for session {session_id}")
        
        # Get session
        session_manager = get_session_manager()
        session = await session_manager.get_session(session_id)
        
        if not session:
            logger.error(f"Session not found: {session_id}")
            await websocket.close(code=4000, reason="Session not found")
            return
        
        # Handle the media stream
        handler = MediaStreamHandler(websocket, session)
        try:
            await handler.handle()
        finally:
            # Only end session if NOT in a conference (conference stream will take over)
            if not session.in_conference:
                await session_manager.end_session(session_id)
            else:
                logger.info(f"Main stream ended but session {session_id} kept alive for conference")
    
    @app.websocket("/conference-stream/{session_id}")
    async def handle_conference_stream(websocket: WebSocket, session_id: str):
        """
        WebSocket endpoint for conference media stream.
        
        This stream receives audio from the conference, allowing AI to:
        - Listen to the human agent and caller conversation
        - Respond when triggered by "AI agent" phrase
        - Continue to use tools during the conference
        """
        logger.info(f"Conference stream connection for session {session_id}")
        
        # Get existing session
        session_manager = get_session_manager()
        session = await session_manager.get_session(session_id)
        
        if not session:
            logger.error(f"Session not found for conference stream: {session_id}")
            await websocket.close(code=4000, reason="Session not found")
            return
        
        logger.info(f"Conference stream connected - AI can hear and use tools")
        
        # Create a new media handler for the conference stream
        # This shares the same session/OpenAI connection
        handler = MediaStreamHandler(websocket, session, is_conference_stream=True)
        try:
            await handler.handle()
        except Exception as e:
            logger.error(f"Conference stream error: {e}")
        finally:
            # End the session when conference stream closes
            logger.info(f"Conference stream ended for session {session_id}")
            await session_manager.end_session(session_id)
    
    @app.post("/ai-join-conference/{session_id}/{conference_name}")
    async def ai_join_conference(session_id: str, conference_name: str, request: Request):
        """
        TwiML endpoint for AI to join conference with bidirectional audio.
        
        When the AI participant call is connected, this returns TwiML that:
        1. Connects the AI to a media stream (for bidirectional audio)
        2. The stream handles receiving audio from conference and sending AI responses
        """
        config = get_config()
        ws_url = f"wss://{config.webhook_domain}/conference-stream/{session_id}"
        
        logger.info(f"AI joining conference: {conference_name} via stream {ws_url}")
        
        # Return TwiML that connects this call leg to our WebSocket for bidirectional audio
        twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{ws_url}">
            <Parameter name="conference_name" value="{conference_name}" />
            <Parameter name="session_id" value="{session_id}" />
        </Stream>
    </Connect>
</Response>'''
        
        return Response(content=twiml, media_type="application/xml")
    
    @app.post("/twiml-app/voice")
    async def twiml_app_voice_webhook(request: Request):
        """
        TwiML Application webhook - handles TWO scenarios:
        
        1. BROWSER CALL: When a browser client calls using device.connect()
           - Twilio sends: CallSid, From (client:identity), To (app:APxxx or phone number)
           - We connect the browser to the AI agent via WebSocket stream
           
        2. AI JOINING CONFERENCE: When AI is added as conference participant
           - Twilio sends: session_id and conference_name as query params
           - We connect AI to conference with bidirectional audio
        """
        config = get_config()
        
        # Get query params (for AI conference join)
        session_id = request.query_params.get("session_id", "")
        conference_name = request.query_params.get("conference_name", "")
        
        # Get form data (Twilio sends call info here)
        try:
            form_data = await request.form()
            call_sid = form_data.get("CallSid", "")
            from_number = form_data.get("From", "")
            to_number = form_data.get("To", "")
            direction = form_data.get("Direction", "")
            caller_name = form_data.get("CallerName", "")
            
            # Also check form for session_id/conference_name
            if not session_id:
                session_id = form_data.get("session_id", "")
            if not conference_name:
                conference_name = form_data.get("conference_name", "")
        except:
            call_sid = ""
            from_number = ""
            to_number = ""
            direction = ""
            caller_name = ""
        
        logger.info(f"TwiML App webhook called:")
        logger.info(f"  CallSid: {call_sid}")
        logger.info(f"  From: {from_number}")
        logger.info(f"  To: {to_number}")
        logger.info(f"  Direction: {direction}")
        logger.info(f"  session_id: {session_id}")
        logger.info(f"  conference_name: {conference_name}")
        
        # SCENARIO 1: Browser call (from client:xxx)
        # When browser calls, From starts with "client:" and there's no session_id param
        is_browser_call = from_number.startswith("client:") and not session_id
        
        if is_browser_call:
            logger.info("📞 BROWSER CALL DETECTED - Connecting to AI agent")
            
            # Create session using session_manager (it generates the session_id)
            session_manager = get_session_manager()
            account_sid = form_data.get("AccountSid", config.twilio_account_sid)
            call_info = CallInfo(
                call_sid=call_sid,
                from_number=from_number,
                to_number=to_number or config.twilio_phone_number,
                direction="inbound",
                account_sid=account_sid,
                caller_name=caller_name or from_number.replace("client:", "")
            )
            browser_session_id = await session_manager.create_session(call_info)
            logger.info(f"Created browser session: {browser_session_id}")
            
            # Return TwiML that connects to our WebSocket stream (same as phone calls)
            ws_url = f"wss://{config.webhook_domain}/media-stream/{browser_session_id}"
            
            twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{ws_url}" />
    </Connect>
</Response>'''
            
            logger.info(f"Browser client connecting to stream: {ws_url}")
            return Response(content=twiml, media_type="application/xml")
        
        # SCENARIO 2: AI joining conference (has session_id param)
        if session_id:
            logger.info(f"🤖 AI CONFERENCE JOIN - Session: {session_id}, Conference: {conference_name}")
            
            ws_url = f"wss://{config.webhook_domain}/conference-stream/{session_id}"
            
            twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{ws_url}">
            <Parameter name="conference_name" value="{conference_name}" />
            <Parameter name="session_id" value="{session_id}" />
            <Parameter name="participant_type" value="ai_agent" />
        </Stream>
    </Connect>
</Response>'''
            
            logger.info(f"AI participant connecting to stream: {ws_url}")
            return Response(content=twiml, media_type="application/xml")
        
        # SCENARIO 3: Unknown call - could be outbound call to a phone number
        # The browser might be calling a phone number via the dialpad
        if to_number and not to_number.startswith("app:"):
            logger.info(f"📱 OUTBOUND CALL to {to_number}")
            
            # Dial the number
            twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="{config.twilio_phone_number}">
        <Number>{to_number}</Number>
    </Dial>
</Response>'''
            
            return Response(content=twiml, media_type="application/xml")
        
        # Fallback - connect to AI agent
        logger.warning("TwiML App called with unknown parameters - connecting to AI")
        import uuid
        fallback_session_id = f"fallback-{uuid.uuid4().hex[:12]}"
        ws_url = f"wss://{config.webhook_domain}/media-stream"
        
        twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{ws_url}">
            <Parameter name="session_id" value="{fallback_session_id}" />
        </Stream>
    </Connect>
</Response>'''
        
        return Response(content=twiml, media_type="application/xml")
    
    @app.post("/conference-announce/{session_id}")
    @app.get("/conference-announce/{session_id}")
    async def conference_announce(session_id: str, request: Request, text: str = ""):
        """
        TwiML endpoint for conference announcements.
        
        Called by Twilio when we set announce_url on a conference.
        Returns TwiML with <Say> to speak the AI's response.
        """
        # Get text from query param or form data
        if not text:
            form_data = await request.form()
            text = form_data.get("text", "")
        
        if not text:
            # Check query params
            text = request.query_params.get("text", "")
        
        logger.info(f"Conference announcement for {session_id}: {text[:50]}...")
        
        # Escape any XML special characters in text
        import html
        safe_text = html.escape(text)
        
        twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">{safe_text}</Say>
</Response>'''
        
        return Response(content=twiml, media_type="application/xml")
    
    @app.post("/twilio/status")
    async def handle_call_status(
        request: Request,
        CallSid: Annotated[str, Form()],
        CallStatus: Annotated[str, Form()] = "",
        CallDuration: Annotated[str | None, Form()] = None,
    ):
        """
        Webhook endpoint for call status updates.
        """
        logger.info(f"Call status update: {CallSid} - {CallStatus}")
        
        if CallStatus in ("completed", "failed", "busy", "no-answer", "canceled"):
            # Find and end the session
            session_manager = get_session_manager()
            # Note: We'd need to track session by call_sid to do this properly
            pass
        
        return {"status": "ok"}
    
    @app.post("/conference-status/{session_id}")
    async def handle_conference_status(
        request: Request,
        session_id: str,
    ):
        """
        Webhook endpoint for conference status updates.
        Captures recordings and transcripts from the conference.
        """
        form_data = await request.form()
        conference_sid = form_data.get("ConferenceSid", "")
        status_event = form_data.get("StatusCallbackEvent", "")
        recording_url = form_data.get("RecordingUrl", "")
        recording_sid = form_data.get("RecordingSid", "")
        friendly_name = form_data.get("FriendlyName", "")
        
        # Get additional participant info
        call_sid = form_data.get("CallSid", "")
        participant_label = form_data.get("ParticipantLabel", "")
        muted = form_data.get("Muted", "")
        hold = form_data.get("Hold", "")
        coaching = form_data.get("Coaching", "")
        
        logger.info("=" * 50)
        logger.info(f"📞 CONFERENCE EVENT: {status_event.upper()}")
        logger.info("=" * 50)
        logger.info(f"   🆔 Session ID: {session_id}")
        logger.info(f"   📛 Conference: {friendly_name}")
        logger.info(f"   🔑 Conference SID: {conference_sid}")
        
        session_manager = get_session_manager()
        session = await session_manager.get_session(session_id)
        
        # Identify participant type (use getattr for safe access to optional attributes)
        participant_type = "Unknown"
        if session:
            human_agent_call_sid = getattr(session, 'human_agent_call_sid', None)
            ai_participant_sid = getattr(session, 'ai_participant_sid', None)
            
            if call_sid == session.call_info.call_sid:
                participant_type = "👤 Caller"
            elif human_agent_call_sid and call_sid == human_agent_call_sid:
                participant_type = "👨‍💼 Human Agent"
            elif ai_participant_sid and call_sid == ai_participant_sid:
                participant_type = "🤖 AI Assistant"
        
        if status_event == "conference-start":
            logger.info(f"   🟢 Conference started")
            logger.info(f"   ℹ️  Recording will begin automatically")
            
        elif status_event == "conference-end":
            logger.info(f"   🔴 Conference ended")
            if recording_url:
                logger.info(f"   🎙️  Recording URL: {recording_url}")
                logger.info(f"   📼 Recording SID: {recording_sid}")
                # Store recording info in session for later retrieval
                if session:
                    session.conference_recording_url = recording_url
                    session.conference_recording_sid = recording_sid
                    
                    # Store in database (if we have contact info)
                    try:
                        from db.queries import save_conference_recording
                        await save_conference_recording(session_id, recording_url, recording_sid)
                        logger.info(f"   ✅ Recording saved to database")
                    except Exception as e:
                        logger.error(f"   ❌ Failed to save conference recording: {e}")
            else:
                logger.info(f"   ℹ️  No recording available")
        
        elif status_event == "participant-join":
            logger.info(f"   🟢 Participant JOINED")
            logger.info(f"   👤 Type: {participant_type}")
            logger.info(f"   📞 Call SID: {call_sid}")
            if participant_label:
                logger.info(f"   🏷️  Label: {participant_label}")
            if muted:
                logger.info(f"   🔇 Muted: {muted}")
            if hold:
                logger.info(f"   ⏸️  On Hold: {hold}")
            
            # Log current conference state
            if session:
                participants = []
                if session.call_info.call_sid:
                    participants.append("Caller")
                if getattr(session, 'human_agent_call_sid', None):
                    participants.append("Human Agent (dialing)")
                if getattr(session, 'ai_participant_sid', None):
                    participants.append("AI Assistant")
                logger.info(f"   📊 Expected participants: {', '.join(participants)}")
            
        elif status_event == "participant-leave":
            logger.info(f"   🔴 Participant LEFT")
            logger.info(f"   👤 Type: {participant_type}")
            logger.info(f"   📞 Call SID: {call_sid}")
            
            # Check if this affects the conference
            if session:
                human_agent_sid = getattr(session, 'human_agent_call_sid', None)
                ai_sid = getattr(session, 'ai_participant_sid', None)
                
                if call_sid == session.call_info.call_sid:
                    logger.info(f"   ⚠️  Caller left - conference should end")
                elif human_agent_sid and call_sid == human_agent_sid:
                    logger.info(f"   ℹ️  Human agent left - AI may resume normal mode")
                elif ai_sid and call_sid == ai_sid:
                    logger.info(f"   ℹ️  AI participant disconnected")
        
        logger.info("=" * 50)
        
        return {"status": "ok"}
    
    @app.post("/recording-status/{session_id}")
    async def handle_recording_status(
        request: Request,
        session_id: str,
    ):
        """
        Webhook endpoint for recording status updates.
        Called when a conference recording is ready.
        """
        form_data = await request.form()
        recording_url = form_data.get("RecordingUrl", "")
        recording_sid = form_data.get("RecordingSid", "")
        recording_status = form_data.get("RecordingStatus", "")
        recording_duration = form_data.get("RecordingDuration", "")
        recording_source = form_data.get("RecordingSource", "")
        recording_channels = form_data.get("RecordingChannels", "")
        
        logger.info("=" * 50)
        logger.info(f"🎙️  RECORDING STATUS: {recording_status.upper()}")
        logger.info("=" * 50)
        logger.info(f"   🆔 Session ID: {session_id}")
        logger.info(f"   📼 Recording SID: {recording_sid}")
        logger.info(f"   📊 Status: {recording_status}")
        
        if recording_status == "in-progress":
            logger.info(f"   ▶️  Recording started")
            logger.info(f"   📡 Source: {recording_source}")
            
        elif recording_status == "completed" and recording_url:
            logger.info(f"   ✅ Recording completed")
            logger.info(f"   ⏱️  Duration: {recording_duration} seconds")
            logger.info(f"   🔗 URL: {recording_url}")
            logger.info(f"   🔊 Channels: {recording_channels}")
            
            # Store recording URL for this session
            session_manager = get_session_manager()
            session = await session_manager.get_session(session_id)
            if session:
                session.conference_recording_url = recording_url
                session.conference_recording_sid = recording_sid
                logger.info(f"   ✅ Recording stored in session")
                
        elif recording_status == "absent":
            logger.info(f"   ⚠️  No recording captured (possibly empty)")
            
        elif recording_status == "failed":
            logger.error(f"   ❌ Recording failed")
        
        logger.info("=" * 50)
        
        return {"status": "ok"}
    
    @app.post("/call-status/{session_id}")
    async def handle_outbound_call_status(
        request: Request,
        session_id: str,
    ):
        """
        Webhook endpoint for outbound call status (human agent call).
        Called when the call to the human agent completes.
        """
        form_data = await request.form()
        call_sid = form_data.get("CallSid", "")
        call_status = form_data.get("CallStatus", "")
        call_duration = form_data.get("CallDuration", "")
        from_number = form_data.get("From", "")
        to_number = form_data.get("To", "")
        direction = form_data.get("Direction", "")
        answered_by = form_data.get("AnsweredBy", "")
        
        logger.info("=" * 50)
        logger.info(f"👨‍💼 HUMAN AGENT CALL STATUS: {call_status.upper()}")
        logger.info("=" * 50)
        logger.info(f"   🆔 Session ID: {session_id}")
        logger.info(f"   📞 Call SID: {call_sid}")
        logger.info(f"   📱 From: {from_number}")
        logger.info(f"   📱 To: {to_number}")
        logger.info(f"   📊 Status: {call_status}")
        
        session_manager = get_session_manager()
        session = await session_manager.get_session(session_id)
        
        if call_status == "ringing":
            logger.info(f"   📳 Human agent phone is ringing...")
            
        elif call_status == "in-progress":
            logger.info(f"   ✅ Human agent answered the call!")
            if answered_by:
                logger.info(f"   🎤 Answered by: {answered_by}")
            
        elif call_status == "completed":
            logger.info(f"   ✅ Human agent call completed successfully")
            logger.info(f"   ⏱️  Duration: {call_duration} seconds")
            if session:
                session.metadata["human_agent_call_duration"] = call_duration
                session.metadata["human_agent_call_result"] = "completed"
                logger.info(f"   ℹ️  Call info saved to session")
                
        elif call_status == "no-answer":
            logger.warning(f"   ⚠️  Human agent did not answer!")
            logger.info(f"   ℹ️  Consider increasing timeout or trying alternate number")
            if session:
                session.metadata["human_agent_call_result"] = call_status
                # TODO: Could trigger AI to apologize and offer callback
                
        elif call_status == "busy":
            logger.warning(f"   ⚠️  Human agent line is busy!")
            if session:
                session.metadata["human_agent_call_result"] = call_status
                # TODO: Could trigger AI to apologize and offer callback
                
        elif call_status == "failed":
            logger.error(f"   ❌ Human agent call failed!")
            if session:
                session.metadata["human_agent_call_result"] = call_status
                # TODO: Could trigger AI to apologize and offer callback
                
        elif call_status == "canceled":
            logger.info(f"   🚫 Human agent call was canceled")
            if session:
                session.metadata["human_agent_call_result"] = call_status
        
        logger.info("=" * 50)
        
        return {"status": "ok"}
    
    return app
