"""
Voice session manager for Real Estate Voice Agent.

Manages active call sessions and their state.
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class SessionState(Enum):
    """State of a voice session."""
    INITIALIZING = "initializing"
    CONNECTED = "connected"
    ACTIVE = "active"
    ENDED = "ended"
    ERROR = "error"


@dataclass
class CallInfo:
    """Information about a phone call."""
    call_sid: str
    from_number: str
    to_number: str
    direction: str = "inbound"
    account_sid: Optional[str] = None
    caller_city: Optional[str] = None
    caller_state: Optional[str] = None
    caller_country: Optional[str] = None


@dataclass
class VoiceSession:
    """Represents an active voice call session."""
    session_id: str
    call_info: CallInfo
    created_at: float = field(default_factory=time.time)
    state: SessionState = SessionState.INITIALIZING
    
    # Tenant context
    tenant_id: Optional[int] = None
    tenant_name: Optional[str] = None
    property_name: Optional[str] = None
    
    # Agent context
    agent_type: Optional[str] = None
    
    # Conversation tracking
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    
    # Metrics
    audio_packets_sent: int = 0
    audio_packets_received: int = 0
    
    # xAI connection
    xai_connection: Optional[Any] = None
    
    def add_message(self, role: str, content: str) -> None:
        """Add a message to conversation history."""
        self.conversation_history.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    def add_tool_call(
        self,
        name: str,
        arguments: Dict[str, Any],
        result: Any,
        success: bool = True
    ) -> None:
        """Record a tool call."""
        self.tool_calls.append({
            "name": name,
            "arguments": arguments,
            "result": result,
            "success": success,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    def get_duration(self) -> int:
        """Get session duration in seconds."""
        return int(time.time() - self.created_at)


class SessionManager:
    """Manages active voice sessions."""
    
    def __init__(self, max_sessions: int = 50):
        self._sessions: Dict[str, VoiceSession] = {}
        self._call_sid_map: Dict[str, str] = {}  # call_sid -> session_id
        self._max_sessions = max_sessions
        self._lock = asyncio.Lock()
    
    @property
    def active_session_count(self) -> int:
        """Get number of active sessions."""
        return len(self._sessions)
    
    async def create_session(self, call_info: CallInfo) -> Optional[VoiceSession]:
        """Create a new voice session."""
        async with self._lock:
            # Check capacity
            if len(self._sessions) >= self._max_sessions:
                logger.warning(f"Max sessions ({self._max_sessions}) reached")
                return None
            
            # Generate session ID
            session_id = str(uuid.uuid4())
            
            # Create session
            session = VoiceSession(
                session_id=session_id,
                call_info=call_info
            )
            
            # Store session
            self._sessions[session_id] = session
            self._call_sid_map[call_info.call_sid] = session_id
            
            logger.info(f"Created session {session_id} for call {call_info.call_sid}")
            return session
    
    def get_session(self, session_id: str) -> Optional[VoiceSession]:
        """Get a session by ID."""
        return self._sessions.get(session_id)
    
    def get_session_by_call_sid(self, call_sid: str) -> Optional[VoiceSession]:
        """Get a session by Twilio call SID."""
        session_id = self._call_sid_map.get(call_sid)
        if session_id:
            return self._sessions.get(session_id)
        return None
    
    def get_all_sessions(self) -> List[VoiceSession]:
        """Get all active sessions."""
        return list(self._sessions.values())
    
    async def end_session(self, session_id: str) -> Optional[VoiceSession]:
        """End a session and clean up resources."""
        async with self._lock:
            session = self._sessions.pop(session_id, None)
            if session:
                # Remove from call_sid map
                self._call_sid_map.pop(session.call_info.call_sid, None)
                
                # Close xAI connection
                if session.xai_connection:
                    try:
                        await session.xai_connection.disconnect()
                    except Exception as e:
                        logger.error(f"Error disconnecting xAI: {e}")
                
                session.state = SessionState.ENDED
                logger.info(f"Ended session {session_id}")
            
            return session
    
    async def end_session_by_call_sid(self, call_sid: str) -> Optional[VoiceSession]:
        """End a session by Twilio call SID."""
        session_id = self._call_sid_map.get(call_sid)
        if session_id:
            return await self.end_session(session_id)
        return None
    
    async def cleanup_stale_sessions(self, max_age_seconds: int = 3600) -> int:
        """Remove sessions older than max_age_seconds."""
        now = time.time()
        stale_sessions = [
            s.session_id for s in self._sessions.values()
            if now - s.created_at > max_age_seconds
        ]
        
        cleaned = 0
        for session_id in stale_sessions:
            await self.end_session(session_id)
            cleaned += 1
        
        if cleaned:
            logger.info(f"Cleaned up {cleaned} stale sessions")
        
        return cleaned
    
    async def stop(self) -> None:
        """Stop all sessions and clean up."""
        session_ids = list(self._sessions.keys())
        for session_id in session_ids:
            await self.end_session(session_id)
        
        logger.info("Session manager stopped")


# Global session manager instance
_session_manager: Optional[SessionManager] = None


async def init_session_manager(max_sessions: int = 50) -> SessionManager:
    """Initialize the global session manager."""
    global _session_manager
    _session_manager = SessionManager(max_sessions=max_sessions)
    return _session_manager


def get_session_manager() -> SessionManager:
    """Get the global session manager instance."""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager
