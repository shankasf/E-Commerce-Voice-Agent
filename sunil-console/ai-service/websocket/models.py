"""
WebSocket Message Models for Device Communication.

All message types used in bidirectional WebSocket communication
between the AI service and Windows desktop app.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ============================================
# Base Message
# ============================================

class WSMessage(BaseModel):
    """Base class for all WebSocket messages."""
    type: str

    class Config:
        extra = "allow"  # Allow additional fields for flexibility


# ============================================
# Authentication Messages
# ============================================

class AuthRequest(WSMessage):
    """Authentication request with 6-digit code."""
    type: str = "auth"
    code: str
    user_id: int
    organization_id: int
    device_id: int


class AuthResponse(WSMessage):
    """Authentication response."""
    type: str = "auth_response"
    success: bool
    error_code: Optional[str] = None
    error_message: Optional[str] = None


# ============================================
# Connection Messages
# ============================================

class ConnectionEstablished(WSMessage):
    """Sent when connection is successfully established."""
    type: str = "connection_established"
    device_id: int
    user_id: int
    chat_session_id: str


class ErrorMessage(WSMessage):
    """Error message sent to client."""
    type: str = "error"
    code: str
    message: str


# ============================================
# Chat Messages
# ============================================

class ChatMessage(WSMessage):
    """Single chat message."""
    type: str = "chat"
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: Optional[str] = None

    @classmethod
    def from_user(cls, content: str) -> "ChatMessage":
        """Create a user message."""
        return cls(role="user", content=content, timestamp=datetime.utcnow().isoformat())

    @classmethod
    def from_assistant(cls, content: str) -> "ChatMessage":
        """Create an assistant message."""
        return cls(role="assistant", content=content, timestamp=datetime.utcnow().isoformat())


class ChatHistory(WSMessage):
    """Chat history sent on connection."""
    type: str = "chat_history"
    messages: List[Dict[str, Any]]


# ============================================
# Command Messages
# ============================================

class PowerShellRequest(WSMessage):
    """AI requests PowerShell command execution on device."""
    type: str = "powershell_request"
    command_id: str
    command: str
    description: str
    requires_consent: bool = True


class PowerShellResult(WSMessage):
    """Result of PowerShell command from device."""
    type: str = "powershell_result"
    command_id: str
    status: str  # 'success', 'error', 'timeout', 'declined'
    output: Optional[str] = None
    error: Optional[str] = None
    reason: Optional[str] = None
    execution_time_ms: Optional[int] = None


class CommandConsent(WSMessage):
    """User consent response for command execution."""
    type: str = "command_consent"
    command_id: str
    approved: bool
    reason: Optional[str] = None


# ============================================
# Heartbeat Messages
# ============================================

class Heartbeat(WSMessage):
    """Heartbeat ping from client."""
    type: str = "heartbeat"


class HeartbeatAck(WSMessage):
    """Heartbeat acknowledgment from server."""
    type: str = "heartbeat_ack"


# ============================================
# Message Type Registry
# ============================================

MESSAGE_TYPES = {
    "auth": AuthRequest,
    "chat": ChatMessage,
    "chat_history": ChatHistory,
    "powershell_request": PowerShellRequest,
    "powershell_result": PowerShellResult,
    "command_consent": CommandConsent,
    "heartbeat": Heartbeat,
    "heartbeat_ack": HeartbeatAck,
    "connection_established": ConnectionEstablished,
    "error": ErrorMessage,
}


def parse_message(data: Dict[str, Any]) -> Optional[WSMessage]:
    """Parse raw dict into typed message model."""
    msg_type = data.get("type")
    model_class = MESSAGE_TYPES.get(msg_type)
    if model_class:
        try:
            return model_class(**data)
        except Exception:
            return None
    return WSMessage(**data)
