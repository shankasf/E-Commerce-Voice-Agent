"""
GlamBook AI Service - Main Application

FastAPI application for the salon voice agent.
"""

import os
import json
import logging
import uuid
import asyncio
import httpx
from contextlib import asynccontextmanager
from datetime import datetime, date, time, timedelta
from typing import Any, Dict, List, Optional, Set

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Body, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response, FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from config import get_config
from app_agents import triage_agent, booking_agent, inquiry_agent, reschedule_agent
from voice import get_voice
from db.queries import (
    find_customer_by_phone,
    get_salon_settings,
    get_business_hours,
    get_all_services,
    get_service_categories,
    get_all_stylists,
    get_available_slots,
    create_appointment,
    cancel_appointment,
    reschedule_appointment,
    create_customer,
    get_customer_appointments,
    create_call_log,
    update_call_log,
    log_agent_interaction,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Get config early for lifespan
config = get_config()


# ============================================
# Realtime Log Broadcasting
# ============================================

class LogBroadcaster:
    """Broadcast realtime logs to connected clients via SSE."""
    
    def __init__(self):
        self.subscribers: Set[asyncio.Queue] = set()
        
    async def subscribe(self) -> asyncio.Queue:
        """Subscribe to log events."""
        queue = asyncio.Queue()
        self.subscribers.add(queue)
        logger.info(f"Log subscriber connected. Total: {len(self.subscribers)}")
        return queue
    
    def unsubscribe(self, queue: asyncio.Queue):
        """Unsubscribe from log events."""
        self.subscribers.discard(queue)
        logger.info(f"Log subscriber disconnected. Total: {len(self.subscribers)}")
    
    async def broadcast(self, log_entry: dict):
        """Broadcast a log entry to all subscribers."""
        if not self.subscribers:
            return
        
        # Add timestamp if not present
        if "timestamp" not in log_entry:
            log_entry["timestamp"] = datetime.now().isoformat()
        
        for queue in self.subscribers.copy():
            try:
                await queue.put(log_entry)
            except Exception:
                self.subscribers.discard(queue)
    
    def log_transcript(self, session_id: str, role: str, text: str, is_final: bool = True):
        """Log a transcript event."""
        asyncio.create_task(self.broadcast({
            "type": "transcript",
            "session_id": session_id,
            "role": role,
            "text": text,
            "is_final": is_final,
        }))
    
    def log_function_call(self, session_id: str, function_name: str, args: dict, result: any = None, error: str = None):
        """Log a function call event."""
        asyncio.create_task(self.broadcast({
            "type": "function_call",
            "session_id": session_id,
            "function_name": function_name,
            "arguments": args,
            "result": result,
            "error": error,
        }))
    
    def log_error(self, session_id: str, error: str, details: dict = None):
        """Log an error event."""
        asyncio.create_task(self.broadcast({
            "type": "error",
            "session_id": session_id,
            "error": error,
            "details": details or {},
        }))
    
    def log_event(self, session_id: str, event_type: str, data: dict):
        """Log a generic event."""
        asyncio.create_task(self.broadcast({
            "type": event_type,
            "session_id": session_id,
            **data,
        }))


# Global log broadcaster
log_broadcaster = LogBroadcaster()

# Store ElevenLabs agent ID (created on startup)
elevenlabs_agent_id: Optional[str] = None

# System prompt for the salon voice agent
SALON_SYSTEM_PROMPT = """You are a friendly and professional AI assistant for GlamBook Salon. Your role is to help customers with:

1. **Booking Appointments**: Help customers schedule appointments for haircuts, coloring, styling, manicures, pedicures, and other salon services.

2. **Service Information**: Provide details about available services, pricing, and duration.

3. **Stylist Information**: Share information about our talented stylists and their specialties.

4. **Business Hours**: Inform customers about our operating hours and availability.

5. **Rescheduling/Cancellations**: Help customers modify or cancel their existing appointments.

Guidelines:
- Be warm, welcoming, and professional
- Keep responses concise and conversational (this is a voice call)
- Ask clarifying questions when needed
- Always confirm appointment details before finalizing
- Use the available tools to look up services, check availability, and book appointments

BOOKING FLOW:
1. Ask what service they want (use get_services to look up options)
2. Ask if they have a preferred stylist (use get_stylists to look up options)  
3. Ask what date/time works for them (use get_available_slots to check availability)
4. Confirm all details and use create_appointment to book
5. Provide the booking reference number

Salon Name: GlamBook Salon
"""

SALON_FIRST_MESSAGE = "Hi! Welcome to GlamBook Salon. I'm your AI assistant. How can I help you today? Would you like to book an appointment, learn about our services, or something else?"


def get_agent_tools_config(webhook_base_url: str) -> list:
    """Get the tools configuration for the ElevenLabs agent."""
    return [
        {
            "type": "webhook",
            "name": "get_services",
            "description": "Get the list of all available salon services with prices and duration. Use this when customer asks about services or wants to book.",
            "api_schema": {
                "url": f"{webhook_base_url}/api/agent/tools/get_services",
                "method": "GET",
                "headers": {
                    "Content-Type": "application/json"
                }
            }
        },
        {
            "type": "webhook",
            "name": "get_stylists",
            "description": "Get the list of all stylists at the salon with their specialties. Use this when customer asks about stylists or wants a specific stylist.",
            "api_schema": {
                "url": f"{webhook_base_url}/api/agent/tools/get_stylists",
                "method": "GET",
                "headers": {
                    "Content-Type": "application/json"
                }
            }
        },
        {
            "type": "webhook",
            "name": "get_available_slots",
            "description": "Get available appointment time slots for a specific date and optionally a specific stylist. Returns available times.",
            "api_schema": {
                "url": f"{webhook_base_url}/api/agent/tools/get_available_slots",
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json"
                },
                "body_schema": {
                    "type": "object",
                    "properties": {
                        "date": {
                            "type": "string",
                            "description": "The date to check availability for in YYYY-MM-DD format (e.g., 2025-01-15)"
                        },
                        "stylist_id": {
                            "type": "integer",
                            "description": "Optional stylist ID to check availability for a specific stylist"
                        },
                        "service_id": {
                            "type": "integer",
                            "description": "Optional service ID to filter slots that have enough time for the service"
                        }
                    },
                    "required": ["date"]
                }
            }
        },
        {
            "type": "webhook",
            "name": "create_appointment",
            "description": "Book a new appointment for the customer. Use this after confirming all details with the customer. Returns booking reference.",
            "api_schema": {
                "url": f"{webhook_base_url}/api/agent/tools/create_appointment",
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json"
                },
                "body_schema": {
                    "type": "object",
                    "properties": {
                        "customer_name": {
                            "type": "string",
                            "description": "Customer's full name"
                        },
                        "customer_phone": {
                            "type": "string",
                            "description": "Customer's phone number"
                        },
                        "service_id": {
                            "type": "integer",
                            "description": "The ID of the service to book"
                        },
                        "stylist_id": {
                            "type": "integer",
                            "description": "The ID of the stylist"
                        },
                        "date": {
                            "type": "string",
                            "description": "Appointment date in YYYY-MM-DD format"
                        },
                        "time": {
                            "type": "string",
                            "description": "Appointment time in HH:MM format (24-hour, e.g., 14:30)"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Optional notes or special requests from the customer"
                        }
                    },
                    "required": ["customer_name", "customer_phone", "service_id", "stylist_id", "date", "time"]
                }
            }
        },
        {
            "type": "webhook",
            "name": "lookup_appointment",
            "description": "Look up an existing appointment by reference number or customer phone. Use when customer wants to check, reschedule or cancel.",
            "api_schema": {
                "url": f"{webhook_base_url}/api/agent/tools/lookup_appointment",
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json"
                },
                "body_schema": {
                    "type": "object",
                    "properties": {
                        "reference": {
                            "type": "string",
                            "description": "Booking reference number (e.g., GB-20251230-001)"
                        },
                        "phone": {
                            "type": "string",
                            "description": "Customer phone number to look up their appointments"
                        }
                    }
                }
            }
        },
        {
            "type": "webhook",
            "name": "cancel_appointment",
            "description": "Cancel an existing appointment. Use when customer confirms they want to cancel.",
            "api_schema": {
                "url": f"{webhook_base_url}/api/agent/tools/cancel_appointment",
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json"
                },
                "body_schema": {
                    "type": "object",
                    "properties": {
                        "appointment_id": {
                            "type": "integer",
                            "description": "The appointment ID to cancel"
                        },
                        "reason": {
                            "type": "string",
                            "description": "Reason for cancellation"
                        }
                    },
                    "required": ["appointment_id"]
                }
            }
        },
        {
            "type": "webhook",
            "name": "reschedule_appointment",
            "description": "Reschedule an existing appointment to a new date and time.",
            "api_schema": {
                "url": f"{webhook_base_url}/api/agent/tools/reschedule_appointment",
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json"
                },
                "body_schema": {
                    "type": "object",
                    "properties": {
                        "appointment_id": {
                            "type": "integer",
                            "description": "The appointment ID to reschedule"
                        },
                        "new_date": {
                            "type": "string",
                            "description": "New appointment date in YYYY-MM-DD format"
                        },
                        "new_time": {
                            "type": "string",
                            "description": "New appointment time in HH:MM format (24-hour, e.g., 14:30)"
                        }
                    },
                    "required": ["appointment_id", "new_date", "new_time"]
                }
            }
        },
        {
            "type": "webhook",
            "name": "get_business_hours",
            "description": "Get the salon's business hours and operating schedule.",
            "api_schema": {
                "url": f"{webhook_base_url}/api/agent/tools/get_business_hours",
                "method": "GET",
                "headers": {
                    "Content-Type": "application/json"
                }
            }
        }
    ]


async def create_elevenlabs_agent() -> Optional[str]:
    """Create an ElevenLabs agent dynamically with tools."""
    global elevenlabs_agent_id
    
    if not config.elevenlabs_api_key:
        logger.warning("ELEVENLABS_API_KEY not configured, skipping agent creation")
        return None
    
    # Get webhook base URL for tools
    webhook_base_url = os.getenv("WEBHOOK_BASE_URL", "http://localhost:8086")
    tools_config = get_agent_tools_config(webhook_base_url)
    
    try:
        async with httpx.AsyncClient() as client:
            # Create agent with tools configuration and platform settings for public access
            agent_config = {
                "name": f"GlamBook-{config.salon_name.replace(' ', '-')}-Agent",
                "conversation_config": {
                    "agent": {
                        "prompt": {
                            "prompt": SALON_SYSTEM_PROMPT
                        },
                        "first_message": SALON_FIRST_MESSAGE,
                        "language": "en"
                    },
                    "tts": {
                        "voice_id": config.elevenlabs_voice_id
                    },
                    "tools": tools_config
                },
                # Enable public access - no authentication required for conversations
                "platform_settings": {
                    "auth": {
                        "enable_auth": False  # Allow public access without signed URL
                    }
                }
            }
            
            logger.info(f"Creating ElevenLabs agent with {len(tools_config)} tools, webhook URL: {webhook_base_url}")
            logger.info(f"Agent config: {json.dumps(agent_config, indent=2)}")
            
            response = await client.post(
                "https://api.elevenlabs.io/v1/convai/agents/create",
                headers={
                    "xi-api-key": config.elevenlabs_api_key,
                    "Content-Type": "application/json"
                },
                json=agent_config,
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                agent_id = data.get("agent_id")
                logger.info(f"Created ElevenLabs agent: {agent_id}")
                return agent_id
            else:
                logger.error(f"Failed to create ElevenLabs agent: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"Error creating ElevenLabs agent: {e}")
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    global elevenlabs_agent_id
    
    # Startup
    logger.info("GlamBook AI Service starting...")
    
    # Validate configuration
    errors = config.validate()
    if errors:
        for error in errors:
            logger.warning(f"Config warning: {error}")
    
    # Create ElevenLabs agent
    if config.elevenlabs_api_key:
        elevenlabs_agent_id = await create_elevenlabs_agent()
        if elevenlabs_agent_id:
            logger.info(f"ElevenLabs agent ready: {elevenlabs_agent_id}")
        else:
            logger.warning("ElevenLabs agent creation failed - voice features may not work")
    
    logger.info(f"Salon: {config.salon_name}")
    logger.info("GlamBook AI Service started successfully")
    
    yield
    
    # Shutdown - optionally delete the agent
    logger.info("GlamBook AI Service shutting down...")


# Create FastAPI app
app = FastAPI(
    title="GlamBook AI Service",
    description="AI-powered voice agent for GlamBook Salon",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",  # NestJS backend
        "http://localhost:5173",  # React frontend
        "http://localhost:8080",  # Local dev
        "*",  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Request Logging Middleware for Agent Tools
# ============================================

@app.middleware("http")
async def log_agent_tool_requests(request: Request, call_next):
    """Log all requests to agent tool endpoints for debugging."""
    path = request.url.path
    
    # Only log agent tool requests in detail
    if path.startswith("/api/agent/tools/"):
        tool_name = path.split("/")[-1]
        
        # Get request body for POST requests
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body_bytes = await request.body()
                body = json.loads(body_bytes) if body_bytes else None
                # Reconstruct request since body was consumed
                async def receive():
                    return {"type": "http.request", "body": body_bytes}
                request = Request(request.scope, receive)
            except Exception as e:
                body = f"<error reading body: {e}>"
        
        # Log incoming request with emoji for visibility
        logger.info(f"")
        logger.info(f"🔧 ══════════════════════════════════════════════════")
        logger.info(f"🔧 TOOL CALL: {tool_name}")
        logger.info(f"🔧 Method: {request.method}")
        if body:
            logger.info(f"🔧 Request Body: {json.dumps(body, indent=2)}")
        logger.info(f"🔧 ══════════════════════════════════════════════════")
        
        # Log to realtime broadcaster
        log_broadcaster.log_function_call(
            session_id="agent",
            function_name=tool_name,
            args=body or {}
        )
        
        # Process request and measure time
        start_time = datetime.now()
        response = await call_next(request)
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        logger.info(f"🔧 Response Status: {response.status_code} ({duration:.1f}ms)")
        logger.info(f"")
        
        return response
    
    return await call_next(request)


# Active WebRTC voice sessions
webrtc_sessions: Dict[str, Dict[str, Any]] = {}


# ============================================
# Request/Response Models
# ============================================

class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str = Field(..., description="User message")
    session_id: Optional[str] = Field(None, description="Session ID")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    response: str = Field(..., description="AI response")
    session_id: str = Field(..., description="Session ID")
    agent_name: str = Field(..., description="Agent that responded")
    tool_calls: List[Dict] = Field(default_factory=list)
    audio_url: Optional[str] = Field(None, description="URL to audio response")


class TTSRequest(BaseModel):
    """Request for text-to-speech."""
    text: str = Field(..., description="Text to convert to speech")
    voice_id: Optional[str] = Field(None, description="Voice ID override")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    timestamp: str
    salon_name: str


class ServiceInfo(BaseModel):
    """Service information."""
    service_id: int
    name: str
    description: Optional[str]
    duration_minutes: int
    price: float
    category: Optional[str]


class StylistInfo(BaseModel):
    """Stylist information."""
    stylist_id: int
    full_name: str
    bio: Optional[str]
    specialties: Optional[List[str]]


# ============================================
# Session Management
# ============================================

class SessionManager:
    """Manage conversation sessions."""
    
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
    
    def create_session(self) -> str:
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "created_at": datetime.now().isoformat(),
            "customer_id": None,
            "current_agent": "triage",
            "context": {},
            "history": []
        }
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self.sessions.get(session_id)
    
    def update_session(self, session_id: str, **kwargs):
        if session_id in self.sessions:
            self.sessions[session_id].update(kwargs)
    
    def add_to_history(self, session_id: str, role: str, content: str):
        if session_id in self.sessions:
            self.sessions[session_id]["history"].append({
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            })


session_manager = SessionManager()


# ============================================
# Static Files & Web Dialer
# ============================================

import os
static_dir = os.path.join(os.path.dirname(__file__), 'static')
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/dialer")
async def get_dialer():
    """Serve the web dialer page (legacy - Twilio based)."""
    dialer_path = os.path.join(static_dir, 'dialer.html')
    if os.path.exists(dialer_path):
        return FileResponse(dialer_path)
    raise HTTPException(status_code=404, detail="Dialer page not found")


@app.get("/voice")
async def get_voice_widget():
    """Serve the ElevenLabs voice widget page."""
    widget_path = os.path.join(static_dir, 'voice-widget.html')
    if os.path.exists(widget_path):
        return FileResponse(widget_path)
    raise HTTPException(status_code=404, detail="Voice widget page not found")


@app.get("/dialer-config")
async def get_dialer_config():
    """
    Get dialer configuration.
    Returns ElevenLabs config for WebRTC, and optionally Twilio for phone calls.
    """
    # Twilio phone calling is optional
    twilio_number = config.twilio_phone_number if config.twilio_phone_number else ""
    
    return {
        # ElevenLabs WebRTC (primary method) - uses direct API, no agent needed
        "voice_provider": "elevenlabs",
        "voice_endpoint": "/api/voice/signed-url",
        
        # Twilio phone calling (optional)
        "twilio_phone_number": twilio_number,
        "use_phone_number": bool(twilio_number),
        
        # General
        "salon_name": config.salon_name
    }


# ============================================
# WebRTC Voice Endpoints (ElevenLabs Conversational AI)
# ============================================


@app.get("/api/voice/signed-url")
async def get_elevenlabs_signed_url():
    """
    Get signed URL for ElevenLabs Conversational AI WebSocket connection.
    Uses the agent created on startup.
    """
    global elevenlabs_agent_id
    
    if not config.elevenlabs_api_key:
        raise HTTPException(
            status_code=500,
            detail="ELEVENLABS_API_KEY not configured"
        )
    
    if not elevenlabs_agent_id:
        raise HTTPException(
            status_code=500,
            detail="ElevenLabs agent not initialized. Please check logs for errors."
        )
    
    session_id = str(uuid.uuid4())
    
    try:
        # Get signed URL from ElevenLabs
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.elevenlabs.io/v1/convai/conversation/get_signed_url",
                params={"agent_id": elevenlabs_agent_id},
                headers={"xi-api-key": config.elevenlabs_api_key},
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                signed_url = data.get("signed_url")
                
                webrtc_sessions[session_id] = {
                    "provider": "elevenlabs",
                    "agent_id": elevenlabs_agent_id,
                    "start_time": datetime.now().isoformat(),
                    "messages": [],  # Store conversation messages
                }
                
                # Create call log in database
                try:
                    create_call_log(
                        call_id=session_id,
                        caller_phone="webrtc",
                        session_id=session_id,
                    )
                except Exception as e:
                    logger.warning(f"Failed to create call log: {e}")
                
                # Log session start for realtime logs
                log_broadcaster.log_event(
                    session_id=session_id,
                    event_type="session_start",
                    data={
                        "agent_id": elevenlabs_agent_id,
                        "provider": "elevenlabs",
                    }
                )
                
                logger.info(f"ElevenLabs voice session {session_id} created with agent {elevenlabs_agent_id}")
                
                return {
                    "signedUrl": signed_url,
                    "sessionId": session_id,
                    "agentId": elevenlabs_agent_id,
                }
            else:
                logger.error(f"Failed to get signed URL: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to get ElevenLabs signed URL: {response.text}"
                )
                
    except httpx.RequestError as e:
        logger.error(f"Error getting signed URL: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to connect to ElevenLabs API"
        )


@app.post("/api/voice/log-transcript")
async def log_voice_transcript(request: Request):
    """
    Log transcript messages from voice conversation.
    Called by frontend to save conversation history.
    """
    data = await request.json()
    session_id = data.get("sessionId")
    messages = data.get("messages", [])
    
    if session_id and session_id in webrtc_sessions:
        webrtc_sessions[session_id]["messages"] = messages
        
        # Log each message to database
        try:
            for msg in messages:
                log_agent_interaction(
                    call_id=session_id,
                    session_id=session_id,
                    agent_type="elevenlabs",
                    agent_name="GlamBook Assistant",
                    user_message=msg.get("content", "") if msg.get("role") == "user" else "",
                    agent_response=msg.get("content", "") if msg.get("role") == "assistant" else "",
                )
        except Exception as e:
            logger.warning(f"Failed to log transcript: {e}")
        
        logger.info(f"Logged {len(messages)} messages for session {session_id}")
        return {"success": True, "logged": len(messages)}
    
    return {"success": False, "error": "Session not found"}


@app.post("/api/voice/webrtc/connect")
async def webrtc_voice_connect(request: Request):
    """
    Legacy WebRTC connection endpoint - redirects to ElevenLabs signed URL.
    For backward compatibility. Use /api/voice/signed-url instead.
    """
    # Just return the signed URL for ElevenLabs
    return await get_elevenlabs_signed_url()


@app.post("/api/voice/webrtc/disconnect")
async def webrtc_voice_disconnect(request: Request):
    """Disconnect WebRTC voice session and save call log."""
    data = await request.json()
    session_id = data.get("sessionId")
    messages = data.get("messages", [])
    duration = data.get("duration", 0)
    
    if session_id and session_id in webrtc_sessions:
        session = webrtc_sessions[session_id]
        
        # Update call log with completion status
        try:
            update_call_log(
                session_id,
                status="completed",
                ended_at=datetime.now().isoformat(),
                duration_seconds=duration,
                transcript=json.dumps(messages) if messages else None
            )
        except Exception as e:
            logger.warning(f"Failed to update call log: {e}")
        
        del webrtc_sessions[session_id]
        logger.info(f"WebRTC voice session {session_id} disconnected (duration: {duration}s, messages: {len(messages)})")
    
    return {"success": True, "sessionId": session_id}


@app.get("/api/voice/webrtc/sessions")
async def webrtc_voice_sessions_list():
    """List active WebRTC voice sessions."""
    sessions = []
    for sid, session in webrtc_sessions.items():
        sessions.append({
            "sessionId": sid,
            "provider": session.get("provider"),
            "startTime": session.get("start_time"),
        })
    return {"count": len(sessions), "sessions": sessions}


# ============================================
# Realtime Logs SSE Endpoint
# ============================================

@app.get("/api/voice/logs/stream")
async def stream_voice_logs():
    """
    Server-Sent Events endpoint for realtime voice agent logs.
    
    Returns a stream of events including:
    - transcript: User/assistant speech transcripts
    - function_call: Tool/function calls with arguments and results
    - error: Error messages
    - connection: Session connect/disconnect events
    """
    
    async def event_generator():
        queue = await log_broadcaster.subscribe()
        try:
            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connected', 'timestamp': datetime.now().isoformat()})}\n\n"
            
            while True:
                try:
                    # Wait for new log entry with timeout for keepalive
                    log_entry = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {json.dumps(log_entry)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield f"data: {json.dumps({'type': 'ping', 'timestamp': datetime.now().isoformat()})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            log_broadcaster.unsubscribe(queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/api/voice/logs/emit")
async def emit_voice_log(request: Request):
    """
    Emit a log entry from the frontend.
    Used to capture ElevenLabs WebSocket events that happen client-side.
    """
    data = await request.json()
    session_id = data.get("sessionId", "unknown")
    log_type = data.get("type", "event")
    
    if log_type == "transcript":
        log_broadcaster.log_transcript(
            session_id=session_id,
            role=data.get("role", "user"),
            text=data.get("text", ""),
            is_final=data.get("isFinal", True)
        )
    elif log_type == "function_call":
        log_broadcaster.log_function_call(
            session_id=session_id,
            function_name=data.get("functionName", "unknown"),
            args=data.get("arguments", {}),
            result=data.get("result"),
            error=data.get("error")
        )
    elif log_type == "error":
        log_broadcaster.log_error(
            session_id=session_id,
            error=data.get("error", "Unknown error"),
            details=data.get("details")
        )
    else:
        log_broadcaster.log_event(
            session_id=session_id,
            event_type=log_type,
            data=data.get("data", {})
        )
    
    return {"success": True}


# ============================================
# Agent Tool Webhook Endpoints (for ElevenLabs)
# ============================================

@app.get("/api/agent/tools/get_services")
async def tool_get_services():
    """
    Tool endpoint: Get all available salon services.
    Called by ElevenLabs agent when user asks about services.
    """
    try:
        services = get_all_services()
        
        # Log the tool call
        log_broadcaster.log_function_call(
            session_id="agent",
            function_name="get_services",
            args={},
            result={"count": len(services)}
        )
        
        # Format response for the agent
        formatted_services = []
        for s in services:
            formatted_services.append({
                "id": s.get("service_id"),
                "name": s.get("name"),
                "description": s.get("description", ""),
                "price": float(s.get("price", 0)),
                "duration_minutes": s.get("duration_minutes", 30),
                "category": s.get("category", {}).get("name") if s.get("category") else "General"
            })
        
        return {
            "success": True,
            "services": formatted_services,
            "message": f"Found {len(formatted_services)} services"
        }
    except Exception as e:
        logger.error(f"Tool get_services error: {e}")
        log_broadcaster.log_error("agent", str(e), {"tool": "get_services"})
        return {"success": False, "error": str(e)}


@app.get("/api/agent/tools/get_stylists")
async def tool_get_stylists():
    """
    Tool endpoint: Get all stylists.
    Called by ElevenLabs agent when user asks about stylists.
    """
    try:
        stylists = get_all_stylists()
        
        log_broadcaster.log_function_call(
            session_id="agent",
            function_name="get_stylists",
            args={},
            result={"count": len(stylists)}
        )
        
        formatted_stylists = []
        for s in stylists:
            formatted_stylists.append({
                "id": s.get("stylist_id"),
                "name": s.get("full_name") or f"{s.get('user', {}).get('full_name', 'Unknown')}",
                "specialties": s.get("specialties", []),
                "bio": s.get("bio", "")
            })
        
        return {
            "success": True,
            "stylists": formatted_stylists,
            "message": f"Found {len(formatted_stylists)} stylists"
        }
    except Exception as e:
        logger.error(f"Tool get_stylists error: {e}")
        log_broadcaster.log_error("agent", str(e), {"tool": "get_stylists"})
        return {"success": False, "error": str(e)}


@app.post("/api/agent/tools/get_available_slots")
async def tool_get_available_slots(request: Request):
    """
    Tool endpoint: Get available appointment slots.
    Called by ElevenLabs agent to check availability.
    """
    try:
        data = await request.json()
        logger.info(f"🗓️ get_available_slots processing...")
        
        date_str = data.get("date")
        stylist_id = data.get("stylist_id")
        service_id = data.get("service_id", 1)  # Default to first service if not specified
        
        logger.info(f"   📅 Date: {date_str}")
        logger.info(f"   💇 Service ID: {service_id}")
        logger.info(f"   👤 Stylist ID: {stylist_id}")
        
        if not date_str:
            logger.warning(f"   ❌ Missing date parameter")
            return {"success": False, "error": "Date is required (YYYY-MM-DD format)"}
        
        # Parse date
        try:
            target_date = date.fromisoformat(date_str)
            logger.info(f"   ✅ Parsed date: {target_date}")
        except ValueError:
            logger.warning(f"   ❌ Invalid date format: {date_str}")
            return {"success": False, "error": "Invalid date format. Use YYYY-MM-DD"}
        
        # Get available slots
        logger.info(f"   🔍 Querying database for available slots...")
        slots = get_available_slots(
            service_id=service_id,
            check_date=target_date,
            stylist_id=stylist_id
        )
        logger.info(f"   📊 Database returned {len(slots)} slots")
        
        # Format slots for voice response
        formatted_slots = []
        for slot in slots:
            formatted_slots.append({
                "stylist_id": slot.get("stylist_id"),
                "stylist_name": slot.get("stylist_name"),
                "time": slot.get("time"),
                "available": True
            })
        
        # Summarize unique times for logging
        unique_times = sorted(set(s["time"] for s in formatted_slots if s["time"]))
        logger.info(f"   ⏰ Available times: {unique_times[:10]}{'...' if len(unique_times) > 10 else ''}")
        
        result = {
            "success": True,
            "date": date_str,
            "available_slots": formatted_slots,
            "message": f"Found {len(formatted_slots)} available slots on {date_str}"
        }
        
        logger.info(f"   ✅ Returning {len(formatted_slots)} slots")
        
        # Log result to broadcaster
        log_broadcaster.log_function_call(
            session_id="agent",
            function_name="get_available_slots",
            args=data,
            result={"slot_count": len(formatted_slots), "times": unique_times[:5]}
        )
        
        return result
    except Exception as e:
        logger.error(f"   ❌ Tool get_available_slots error: {e}")
        import traceback
        logger.error(f"   Traceback: {traceback.format_exc()}")
        log_broadcaster.log_error("agent", str(e), {"tool": "get_available_slots"})
        return {"success": False, "error": str(e)}


@app.post("/api/agent/tools/create_appointment")
async def tool_create_appointment(request: Request):
    """
    Tool endpoint: Create a new appointment.
    Called by ElevenLabs agent to book an appointment.
    """
    try:
        data = await request.json()
        logger.info(f"📝 create_appointment processing...")
        
        customer_name = data.get("customer_name")
        customer_phone = data.get("customer_phone")
        service_id = data.get("service_id")
        stylist_id = data.get("stylist_id")
        date_str = data.get("date")
        time_str = data.get("time")
        notes = data.get("notes", "")
        
        logger.info(f"   👤 Customer: {customer_name}")
        logger.info(f"   📞 Phone: {customer_phone}")
        logger.info(f"   💇 Service ID: {service_id}, Stylist ID: {stylist_id}")
        logger.info(f"   📅 Date: {date_str}, Time: {time_str}")
        
        # Validate required fields
        if not all([customer_name, customer_phone, service_id, stylist_id, date_str, time_str]):
            missing = []
            if not customer_name: missing.append("customer_name")
            if not customer_phone: missing.append("customer_phone")
            if not service_id: missing.append("service_id")
            if not stylist_id: missing.append("stylist_id")
            if not date_str: missing.append("date")
            if not time_str: missing.append("time")
            error_msg = f"Missing required fields: {', '.join(missing)}"
            logger.warning(f"   ❌ {error_msg}")
            log_broadcaster.log_error("agent", error_msg, {"tool": "create_appointment", "data": data})
            return {"success": False, "error": error_msg}
        
        # Parse date and time
        try:
            appointment_date = date.fromisoformat(date_str)
            # Handle time with or without seconds
            if len(time_str) == 5:
                time_str += ":00"
            appointment_time = time.fromisoformat(time_str)
            logger.info(f"   ✅ Parsed: {appointment_date} at {appointment_time}")
        except ValueError as e:
            logger.warning(f"   ❌ Invalid date/time format: {e}")
            return {"success": False, "error": f"Invalid date/time format: {e}"}
        
        # Find or create customer
        logger.info(f"   🔍 Looking up customer by phone: {customer_phone}")
        customer = find_customer_by_phone(customer_phone)
        if not customer:
            logger.info(f"   ➕ Creating new customer: {customer_name}")
            customer = create_customer(
                phone=customer_phone,
                full_name=customer_name
            )
            logger.info(f"   ✅ Customer created with ID: {customer.get('customer_id')}")
        else:
            logger.info(f"   ✅ Found existing customer ID: {customer.get('customer_id')}")
        
        customer_id = customer.get("customer_id")
        if not customer_id:
            logger.error(f"   ❌ Failed to get customer_id from: {customer}")
            return {"success": False, "error": "Failed to get or create customer"}
        
        # Find the most recent active call log to link the appointment
        # Since ElevenLabs webhooks don't pass session context, we link to the latest in_progress call
        call_id = None
        try:
            from db import get_db_cursor
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT call_id FROM call_logs
                    WHERE status = 'in_progress' AND caller_phone = 'webrtc'
                    ORDER BY created_at DESC LIMIT 1
                """)
                result = cursor.fetchone()
                if result:
                    call_id = result['call_id']
                    logger.info(f"   📞 Linking to call: {call_id}")
        except Exception as e:
            logger.warning(f"   ⚠️ Could not find active call: {e}")

        # Create the appointment
        logger.info(f"   📝 Creating appointment in database...")
        appointment = create_appointment(
            customer_id=customer_id,
            stylist_id=stylist_id,
            service_ids=[service_id],
            appointment_date=appointment_date,
            start_time=appointment_time,
            customer_notes=notes,
            booked_via="voice_agent",
            call_id=call_id
        )

        if appointment:
            # Update the call log with the appointment_id
            if call_id:
                try:
                    update_call_log(
                        call_id,
                        appointment_id=appointment.get("appointment_id"),
                        action_taken="appointment_booked"
                    )
                    logger.info(f"   ✅ Linked appointment to call log")
                except Exception as e:
                    logger.warning(f"   ⚠️ Failed to update call log: {e}")
            reference = appointment.get("booking_reference") or f"GB-{date_str.replace('-', '')}-{appointment.get('appointment_id', '000'):03d}"
            
            logger.info(f"   🎉 APPOINTMENT CREATED!")
            logger.info(f"   📋 Reference: {reference}")
            logger.info(f"   🆔 Appointment ID: {appointment.get('appointment_id')}")
            
            result = {
                "success": True,
                "appointment_id": appointment.get("appointment_id"),
                "reference": reference,
                "date": date_str,
                "time": time_str,
                "message": f"Appointment booked successfully! Reference number: {reference}"
            }
            
            log_broadcaster.log_function_call(
                session_id="agent",
                function_name="create_appointment",
                args=data,
                result={"reference": reference, "appointment_id": appointment.get("appointment_id")}
            )
            
            return result
        else:
            logger.error(f"   ❌ create_appointment returned None")
            return {"success": False, "error": "Failed to create appointment"}
            
    except Exception as e:
        logger.error(f"   ❌ Tool create_appointment error: {e}")
        import traceback
        logger.error(f"   Traceback: {traceback.format_exc()}")
        log_broadcaster.log_error("agent", str(e), {"tool": "create_appointment"})
        return {"success": False, "error": str(e)}


@app.post("/api/agent/tools/book_appointment")
async def tool_book_appointment(request: Request):
    """
    Alias for create_appointment - some LLMs may use 'book' instead of 'create'.
    """
    return await tool_create_appointment(request)


@app.post("/api/agent/tools/lookup_appointment")
async def tool_lookup_appointment(request: Request):
    """
    Tool endpoint: Look up an existing appointment.
    Called by ElevenLabs agent when customer wants to check/modify appointment.
    """
    try:
        data = await request.json()
        reference = data.get("reference")
        phone = data.get("phone")
        
        logger.info(f"🔍 lookup_appointment processing...")
        logger.info(f"   📞 Phone: {phone}")
        logger.info(f"   📋 Reference: {reference}")
        
        if not reference and not phone:
            logger.warning(f"   ❌ No phone or reference provided")
            return {"success": False, "error": "Please provide either a booking reference or phone number"}
        
        appointments = []
        
        if phone:
            logger.info(f"   🔍 Looking up customer by phone...")
            customer = find_customer_by_phone(phone)
            if customer:
                customer_id = customer.get("customer_id")
                logger.info(f"   ✅ Found customer ID: {customer_id}")
                if customer_id:
                    appointments = get_customer_appointments(customer_id, upcoming_only=True)
                    logger.info(f"   📊 Found {len(appointments)} appointments")
            else:
                logger.info(f"   ℹ️ No customer found with phone: {phone}")
        
        # TODO: Add reference number lookup if needed
        
        if appointments:
            formatted = []
            for apt in appointments:
                formatted.append({
                    "appointment_id": apt.get("appointment_id"),
                    "date": apt.get("appointment_date"),
                    "time": apt.get("start_time"),
                    "status": apt.get("status"),
                    "services": [s.get("service_name") for s in apt.get("appointment_services", [])]
                })
            
            return {
                "success": True,
                "appointments": formatted,
                "message": f"Found {len(formatted)} upcoming appointment(s)"
            }
        else:
            return {
                "success": True,
                "appointments": [],
                "message": "No upcoming appointments found"
            }
            
    except Exception as e:
        logger.error(f"Tool lookup_appointment error: {e}")
        log_broadcaster.log_error("agent", str(e), {"tool": "lookup_appointment"})
        return {"success": False, "error": str(e)}


@app.post("/api/agent/tools/cancel_appointment")
async def tool_cancel_appointment(request: Request):
    """
    Tool endpoint: Cancel an appointment.
    Called by ElevenLabs agent when customer wants to cancel.
    """
    try:
        data = await request.json()
        appointment_id = data.get("appointment_id")
        reason = data.get("reason", "Cancelled via voice agent")
        
        logger.info(f"❌ cancel_appointment processing...")
        logger.info(f"   🆔 Appointment ID: {appointment_id}")
        logger.info(f"   📝 Reason: {reason}")
        
        if not appointment_id:
            logger.warning(f"   ❌ Missing appointment_id")
            return {"success": False, "error": "Appointment ID is required"}
        
        logger.info(f"   🗑️ Cancelling appointment...")
        result = cancel_appointment(
            appointment_id=appointment_id,
            cancelled_by=None,  # Voice agent cancellation - no user ID
            reason=reason or "Cancelled via voice agent"
        )
        
        if result:
            logger.info(f"   ✅ Appointment cancelled successfully")
            log_broadcaster.log_function_call(
                session_id="agent",
                function_name="cancel_appointment",
                args=data,
                result={"cancelled": True}
            )
            return {
                "success": True,
                "message": "Appointment has been cancelled successfully"
            }
        else:
            logger.error(f"   ❌ cancel_appointment returned None")
            return {"success": False, "error": "Failed to cancel appointment"}
            
    except Exception as e:
        logger.error(f"   ❌ Tool cancel_appointment error: {e}")
        import traceback
        logger.error(f"   Traceback: {traceback.format_exc()}")
        log_broadcaster.log_error("agent", str(e), {"tool": "cancel_appointment"})
        return {"success": False, "error": str(e)}


@app.post("/api/agent/tools/reschedule_appointment")
async def tool_reschedule_appointment(request: Request):
    """
    Tool endpoint: Reschedule an existing appointment.
    Called by ElevenLabs agent when customer wants to change their appointment time.
    """
    try:
        data = await request.json()
        appointment_id = data.get("appointment_id")
        new_date_str = data.get("new_date")
        new_time_str = data.get("new_time")
        
        log_broadcaster.log_function_call(
            session_id="agent",
            function_name="reschedule_appointment",
            args=data
        )
        
        if not appointment_id:
            return {"success": False, "error": "Appointment ID is required"}
        if not new_date_str:
            return {"success": False, "error": "New date is required (YYYY-MM-DD format)"}
        if not new_time_str:
            return {"success": False, "error": "New time is required (HH:MM format)"}
        
        # Parse date and time
        try:
            new_date = date.fromisoformat(new_date_str)
            if len(new_time_str) == 5:
                new_time_str += ":00"
            new_time = time.fromisoformat(new_time_str)
        except ValueError as e:
            return {"success": False, "error": f"Invalid date/time format: {e}"}
        
        result = reschedule_appointment(
            appointment_id=appointment_id,
            new_date=new_date,
            new_start_time=new_time
        )
        
        if result:
            log_broadcaster.log_function_call(
                session_id="agent",
                function_name="reschedule_appointment",
                args=data,
                result={"success": True, "new_date": new_date_str, "new_time": new_time_str}
            )
            return {
                "success": True,
                "appointment_id": appointment_id,
                "new_date": new_date_str,
                "new_time": new_time_str,
                "message": f"Appointment has been rescheduled to {new_date_str} at {new_time_str}"
            }
        else:
            return {"success": False, "error": "Failed to reschedule appointment. The slot may not be available."}
            
    except Exception as e:
        logger.error(f"Tool reschedule_appointment error: {e}")
        log_broadcaster.log_error("agent", str(e), {"tool": "reschedule_appointment"})
        return {"success": False, "error": str(e)}


@app.get("/api/agent/tools/get_business_hours")
async def tool_get_business_hours():
    """
    Tool endpoint: Get salon business hours.
    Called by ElevenLabs agent when customer asks about hours.
    """
    try:
        hours = get_business_hours()
        
        log_broadcaster.log_function_call(
            session_id="agent",
            function_name="get_business_hours",
            args={},
            result={"days": len(hours)}
        )
        
        # Format for voice response
        formatted_hours = {}
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        for h in hours:
            day_idx = h.get("day_of_week", 0)
            day_name = day_names[day_idx] if 0 <= day_idx < 7 else f"Day {day_idx}"
            if h.get("is_closed"):
                formatted_hours[day_name] = "Closed"
            else:
                open_time = h.get("open_time", "09:00")
                close_time = h.get("close_time", "17:00")
                formatted_hours[day_name] = f"{open_time} to {close_time}"
        
        return {
            "success": True,
            "hours": formatted_hours,
            "message": "Here are our business hours"
        }
    except Exception as e:
        logger.error(f"Tool get_business_hours error: {e}")
        log_broadcaster.log_error("agent", str(e), {"tool": "get_business_hours"})
        return {"success": False, "error": str(e)}


@app.get("/voice-token")
async def get_voice_token(identity: str = "web-user"):
    """
    Generate an access token for the Twilio Voice JavaScript SDK.
    Only available if Twilio is configured with a phone number.
    """
    # Twilio is optional - only available if phone number is configured
    if not config.twilio_phone_number:
        raise HTTPException(
            status_code=400,
            detail="Twilio phone calling not configured. Use WebRTC with ElevenLabs instead (/api/voice/signed-url)"
        )
    
    from twilio.jwt.access_token import AccessToken
    from twilio.jwt.access_token.grants import VoiceGrant
    
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
    Only active if Twilio phone number is configured.
    """
    # Twilio webhooks only work if Twilio is configured
    if not config.twilio_phone_number:
        raise HTTPException(status_code=400, detail="Twilio not configured")
    
    from twilio.twiml.voice_response import VoiceResponse, Connect
    
    logger.info(f"Web dialer call: {CallSid} from {From} to {To}")
    
    # Create call log
    create_call_log(
        call_id=CallSid,
        caller_phone=From or "web-dialer",
        session_id=CallSid
    )
    
    # Look up customer if phone provided
    if From and From != "web-dialer":
        customer = find_customer_by_phone(From)
        if customer:
            update_call_log(CallSid, customer_id=customer.get("customer_id"))
    
    # Build WebSocket URL
    host = request.headers.get("host", f"localhost:{config.port}")
    ws_url = f"wss://{host}/twilio/media-stream"
    
    # Create TwiML response with Stream
    response = VoiceResponse()
    connect = Connect()
    connect.stream(url=ws_url, track="both_tracks")
    response.append(connect)
    
    logger.info(f"Connecting web dialer call {CallSid} to WebSocket: {ws_url}")
    
    return Response(content=str(response), media_type="application/xml")


# ============================================
# API Endpoints
# ============================================

@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint."""
    settings = get_salon_settings()
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.now().isoformat(),
        salon_name=settings.get("salon_name", config.salon_name)
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return await root()


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint for text-based conversation.
    """
    try:
        # Get or create session
        session_id = request.session_id or session_manager.create_session()
        session = session_manager.get_session(session_id)
        
        if not session:
            session_id = session_manager.create_session()
            session = session_manager.get_session(session_id)
        
        # Add message to history
        session_manager.add_to_history(session_id, "user", request.message)
        
        # Get current agent
        current_agent = session.get("current_agent", "triage")
        
        # Select agent based on state
        agent_map = {
            "triage": triage_agent,
            "booking": booking_agent,
            "inquiry": inquiry_agent,
            "reschedule": reschedule_agent
        }
        
        agent = agent_map.get(current_agent, triage_agent)
        
        # Process with agent (simplified - in production use proper agent runner)
        # For now, return a placeholder response
        response_text = f"I understand you want help with: {request.message}. Let me assist you with that."
        
        # Add response to history
        session_manager.add_to_history(session_id, "assistant", response_text)
        
        return ChatResponse(
            response=response_text,
            session_id=session_id,
            agent_name=agent.name,
            tool_calls=[]
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using Eleven Labs.
    """
    try:
        voice = get_voice()
        audio_bytes = await voice.text_to_speech(
            text=request.text,
            voice_id=request.voice_id
        )
        
        # Return audio as base64 or save to file
        import base64
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        return {
            "audio": audio_b64,
            "format": "mp3",
            "characters": len(request.text)
        }
        
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/voices")
async def list_voices():
    """
    List available Eleven Labs voices.
    """
    try:
        voice = get_voice()
        voices = await voice.get_available_voices()
        return {"voices": voices}
    except Exception as e:
        logger.error(f"Error listing voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Data Endpoints (for Dashboard)
# ============================================

@app.get("/api/services")
async def get_services():
    """Get all salon services."""
    try:
        services = get_all_services()
        return {"services": services}
    except Exception as e:
        logger.error(f"Error getting services: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/categories")
async def get_categories():
    """Get service categories."""
    try:
        categories = get_service_categories()
        return {"categories": categories}
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stylists")
async def get_stylists():
    """Get all stylists."""
    try:
        stylists = get_all_stylists()
        return {"stylists": stylists}
    except Exception as e:
        logger.error(f"Error getting stylists: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/hours")
async def get_hours():
    """Get business hours."""
    try:
        hours = get_business_hours()
        return {"hours": hours}
    except Exception as e:
        logger.error(f"Error getting hours: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/salon")
async def get_salon_info():
    """Get salon settings/info."""
    try:
        settings = get_salon_settings()
        return {"salon": settings}
    except Exception as e:
        logger.error(f"Error getting salon info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# WebSocket for Realtime Voice
# ============================================

@app.websocket("/ws/voice/{session_id}")
async def voice_websocket(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for realtime voice conversation.
    """
    await websocket.accept()
    logger.info(f"Voice WebSocket connected: {session_id}")
    
    try:
        # Create call log
        create_call_log(
            call_id=session_id,
            caller_phone="webrtc",
            session_id=session_id
        )
        
        while True:
            # Receive audio data
            data = await websocket.receive_bytes()
            
            # Process audio (placeholder - integrate with Eleven Labs)
            # In production, stream to Eleven Labs Conversational AI
            
            # For now, echo back a confirmation
            await websocket.send_json({
                "type": "status",
                "message": "Audio received",
                "bytes": len(data)
            })
            
    except WebSocketDisconnect:
        logger.info(f"Voice WebSocket disconnected: {session_id}")
        update_call_log(session_id, status="completed", ended_at=datetime.now().isoformat())
    except Exception as e:
        logger.error(f"Voice WebSocket error: {e}")
        update_call_log(session_id, status="failed")


# ============================================
# Twilio Webhook Endpoints
# ============================================

@app.post("/twilio/voice")
async def twilio_voice_webhook(request: Dict[str, Any] = Body(...)):
    """
    Twilio voice webhook for incoming calls.
    """
    from twilio.twiml.voice_response import VoiceResponse, Connect
    
    call_sid = request.get("CallSid", "")
    from_number = request.get("From", "")
    
    logger.info(f"Incoming call: {call_sid} from {from_number}")
    
    # Create call log
    create_call_log(
        call_id=call_sid,
        caller_phone=from_number,
        session_id=call_sid
    )
    
    # Look up customer
    customer = find_customer_by_phone(from_number)
    if customer:
        update_call_log(call_sid, customer_id=customer.get("customer_id"))
    
    # Generate TwiML response
    response = VoiceResponse()
    
    # Connect to media stream for voice processing
    connect = Connect()
    connect.stream(
        url=f"wss://{request.get('Host', 'localhost')}/twilio/media-stream",
        track="both_tracks"
    )
    response.append(connect)
    
    return str(response)


@app.websocket("/twilio/media-stream")
async def twilio_media_stream(websocket: WebSocket):
    """
    Twilio media stream WebSocket for voice processing.
    """
    await websocket.accept()
    logger.info("Twilio media stream connected")
    
    session_id = None
    
    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            
            event = data.get("event")
            
            if event == "start":
                session_id = data.get("start", {}).get("callSid")
                logger.info(f"Media stream started: {session_id}")
                
            elif event == "media":
                # Receive audio from Twilio
                payload = data.get("media", {}).get("payload")
                # Process with Eleven Labs (placeholder)
                
            elif event == "stop":
                logger.info(f"Media stream stopped: {session_id}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"Twilio media stream disconnected: {session_id}")
    except Exception as e:
        logger.error(f"Media stream error: {e}")


# ============================================
# Dashboard
# ============================================

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard():
    """Serve the dashboard HTML."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>GlamBook AI Dashboard</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100">
        <div class="container mx-auto p-8">
            <h1 class="text-3xl font-bold text-pink-600 mb-8">GlamBook AI Voice Agent</h1>
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-xl font-semibold mb-4">Voice Agent Status</h2>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Online and Ready</span>
                </div>
                <p class="mt-4 text-gray-600">
                    The voice agent is ready to handle calls. 
                    Use the React frontend dashboard for full functionality.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


# ============================================
# Main Entry Point
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=config.host,
        port=config.port,
        reload=True,
        log_level="info"
    )
