"""
Pydantic schemas for API requests and responses.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


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


class WebRTCConnectRequest(BaseModel):
    """Request model for WebRTC connection."""
    sdp: str = Field(..., description="WebRTC SDP offer from browser")
    role: str = Field(default="requester", description="User role: admin, agent, requester")
    maxDuration: Optional[int] = Field(default=15, description="Max call duration in minutes")
    userId: Optional[int] = Field(None, description="User ID from auth")
    userEmail: Optional[str] = Field(None, description="User email")


class WebRTCConnectResponse(BaseModel):
    """Response model for WebRTC connection."""
    sdp: str = Field(..., description="WebRTC SDP answer from OpenAI")
    sessionId: str = Field(..., description="Session ID for tracking the call")
