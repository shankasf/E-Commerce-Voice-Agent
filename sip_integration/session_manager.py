"""
Voice session manager for handling concurrent call sessions.

Follows Single Responsibility Principle - manages only session lifecycle.
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from datetime import datetime

from .interfaces import ISessionManager, CallInfo, CallState
from .config import get_config

logger = logging.getLogger(__name__)


@dataclass
class VoiceSession:
    """Represents an active voice session."""
    
    session_id: str
    call_info: CallInfo
    state: CallState = CallState.RINGING
    created_at: float = field(default_factory=time.time)
    last_activity: float = field(default_factory=time.time)
    
    # Associated connections/resources
    realtime_connection: Optional[Any] = None
    agent_adapter: Optional[Any] = None
    
    # Conversation context
    conversation_history: list = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def is_expired(self, timeout_seconds: int) -> bool:
        """Check if session has expired due to inactivity."""
        return (time.time() - self.last_activity) > timeout_seconds
    
    def touch(self) -> None:
        """Update last activity timestamp."""
        self.last_activity = time.time()
    
    def add_message(self, role: str, content: str) -> None:
        """Add a message to conversation history."""
        self.conversation_history.append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        })
        self.touch()


class VoiceSessionManager(ISessionManager):
    """
    Manages voice call sessions with thread-safe operations.
    
    Implements ISessionManager interface.
    """
    
    def __init__(self, max_sessions: Optional[int] = None, timeout_seconds: Optional[int] = None):
        config = get_config()
        self.max_sessions = max_sessions or config.max_concurrent_sessions
        self.timeout_seconds = timeout_seconds or config.session_timeout_seconds
        
        self._sessions: Dict[str, VoiceSession] = {}
        self._lock = asyncio.Lock()
        
        # Cleanup task
        self._cleanup_task: Optional[asyncio.Task] = None
        self._running = False
    
    async def start(self) -> None:
        """Start the session manager and background cleanup task."""
        if self._running:
            return
        
        self._running = True
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info("VoiceSessionManager started")
    
    async def stop(self) -> None:
        """Stop the session manager and cleanup all sessions."""
        self._running = False
        
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None
        
        # End all active sessions
        async with self._lock:
            session_ids = list(self._sessions.keys())
        
        for session_id in session_ids:
            await self.end_session(session_id)
        
        logger.info("VoiceSessionManager stopped")
    
    async def create_session(self, call_info: CallInfo) -> str:
        """
        Create a new voice session.
        
        Args:
            call_info: Information about the incoming call
            
        Returns:
            Unique session ID
            
        Raises:
            RuntimeError: If max sessions exceeded
        """
        async with self._lock:
            # Check session limit
            if len(self._sessions) >= self.max_sessions:
                # Try to cleanup expired sessions first
                expired = await self._cleanup_expired_sessions_locked()
                if len(self._sessions) >= self.max_sessions:
                    raise RuntimeError(f"Maximum sessions ({self.max_sessions}) exceeded")
            
            # Generate unique session ID
            session_id = f"voice-{call_info.call_sid[:8]}-{uuid.uuid4().hex[:8]}"
            
            # Create session
            session = VoiceSession(
                session_id=session_id,
                call_info=call_info,
                state=CallState.RINGING
            )
            
            self._sessions[session_id] = session
            logger.info(f"Created session {session_id} for call {call_info.call_sid}")
            
            return session_id
    
    async def get_session(self, session_id: str) -> Optional[VoiceSession]:
        """
        Get a session by ID.
        
        Args:
            session_id: The session ID
            
        Returns:
            VoiceSession if found, None otherwise
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.touch()
            return session
    
    async def get_session_by_call_sid(self, call_sid: str) -> Optional[VoiceSession]:
        """
        Find a session by Twilio call SID.
        
        Args:
            call_sid: The Twilio call SID
            
        Returns:
            VoiceSession if found, None otherwise
        """
        async with self._lock:
            for session in self._sessions.values():
                if session.call_info.call_sid == call_sid:
                    session.touch()
                    return session
            return None
    
    async def update_session_state(self, session_id: str, state: CallState) -> bool:
        """
        Update session state.
        
        Args:
            session_id: The session ID
            state: New call state
            
        Returns:
            True if updated, False if session not found
        """
        async with self._lock:
            session = self._sessions.get(session_id)
            if session:
                session.state = state
                session.touch()
                logger.info(f"Session {session_id} state changed to {state.value}")
                return True
            return False
    
    async def end_session(self, session_id: str) -> None:
        """
        End and cleanup a session.
        
        Args:
            session_id: The session ID to end
        """
        async with self._lock:
            session = self._sessions.pop(session_id, None)
        
        if session:
            # Cleanup associated resources
            if session.realtime_connection:
                try:
                    await session.realtime_connection.disconnect()
                except Exception as e:
                    logger.error(f"Error disconnecting realtime connection: {e}")
            
            session.state = CallState.ENDED
            logger.info(f"Ended session {session_id}")
    
    async def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired sessions.
        
        Returns:
            Number of sessions cleaned up
        """
        async with self._lock:
            return await self._cleanup_expired_sessions_locked()
    
    async def _cleanup_expired_sessions_locked(self) -> int:
        """Internal cleanup method (must hold lock)."""
        expired_ids = [
            sid for sid, session in self._sessions.items()
            if session.is_expired(self.timeout_seconds)
        ]
        
        for session_id in expired_ids:
            session = self._sessions.pop(session_id, None)
            if session and session.realtime_connection:
                try:
                    await session.realtime_connection.disconnect()
                except Exception as e:
                    logger.error(f"Error during cleanup disconnect: {e}")
        
        if expired_ids:
            logger.info(f"Cleaned up {len(expired_ids)} expired sessions")
        
        return len(expired_ids)
    
    async def _cleanup_loop(self) -> None:
        """Background task to periodically cleanup expired sessions."""
        while self._running:
            try:
                await asyncio.sleep(60)  # Check every minute
                await self.cleanup_expired_sessions()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {e}")
    
    @property
    def active_session_count(self) -> int:
        """Get count of active sessions."""
        return len(self._sessions)
    
    async def get_all_sessions(self) -> list[VoiceSession]:
        """Get all active sessions (for monitoring)."""
        async with self._lock:
            return list(self._sessions.values())


# Global session manager instance
_session_manager: Optional[VoiceSessionManager] = None


def get_session_manager() -> VoiceSessionManager:
    """Get or create the global session manager."""
    global _session_manager
    if _session_manager is None:
        _session_manager = VoiceSessionManager()
    return _session_manager


async def init_session_manager() -> VoiceSessionManager:
    """Initialize and start the global session manager."""
    manager = get_session_manager()
    await manager.start()
    return manager
