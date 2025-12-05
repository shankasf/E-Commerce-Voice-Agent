"""
Voice session manager for handling concurrent call sessions.

Follows Single Responsibility Principle - manages only session lifecycle.
"""

import asyncio
import logging
import time
import uuid
import os
import json
import requests
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Tuple
from datetime import datetime

from .interfaces import ISessionManager, CallInfo, CallState
from .config import get_config
from db.database import db

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
            try:
                await self._persist_call_log(session)
            except Exception as e:
                logger.error(f"Failed to persist call log for {session_id}: {e}")
            
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

    # --- Persistence helpers ---
    async def _persist_call_log(self, session: VoiceSession) -> None:
        """Persist conversation history + summary to Supabase."""
        transcript_lines = [f"{m.get('role')}: {m.get('content')}" for m in session.conversation_history]
        full_transcript = "\n".join(transcript_lines).strip()
        duration_seconds = int(time.time() - session.created_at)

        summary, sentiment, lead_score = await self._analyze_conversation(transcript_lines)

        payload = {
            "call_sid": session.call_info.call_sid,
            "session_id": session.session_id,
            "from_number": session.call_info.from_number,
            "to_number": session.call_info.to_number,
            "direction": session.call_info.direction,
            "duration_seconds": duration_seconds,
            "transcript": full_transcript,
            "transcript_json": session.conversation_history,
            "summary": summary,
            "sentiment": sentiment,
            "lead_score": lead_score,
            "ended_at": datetime.utcnow().isoformat(),
        }

        def _insert():
            db.insert("call_logs", payload)

        await asyncio.to_thread(_insert)
        logger.info(f"Persisted call log for session {session.session_id}")

    async def _analyze_conversation(self, transcript_lines: list[str]) -> Tuple[str, str, int]:
        """Summarize conversation + estimate sentiment/lead score via OpenAI; fallback heuristics if it fails."""
        if not transcript_lines:
            return "", "unknown", 0

        conversation_text = "\n".join(transcript_lines)
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            return self._fallback_summary(transcript_lines)

        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are generating analytics from a voice call. "
                        "Return strict JSON only with keys: summary, sentiment, lead_score. "
                        "- summary: 2 concise sentences, focus on intent/outcome and next step. "
                        "- sentiment: one of positive | neutral | negative. "
                        "- lead_score: integer 0-100, higher = more likely to buy/book; include quick rationale in summary, not a separate field."
                    ),
                },
                {"role": "user", "content": conversation_text},
            ],
            "temperature": 0.2,
            "max_tokens": 180,
            "response_format": {"type": "json_object"},
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        def _request():
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                data=json.dumps(payload),
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
            parsed = json.loads(content)
            return (
                str(parsed.get("summary", "")),
                str(parsed.get("sentiment", "unknown")),
                int(parsed.get("lead_score", 0)),
            )

        try:
            return await asyncio.to_thread(_request)
        except Exception as e:
            logger.error(f"OpenAI summary failed: {e}")
            return self._fallback_summary(transcript_lines)

    def _fallback_summary(self, transcript_lines: list[str]) -> Tuple[str, str, int]:
        """Basic heuristic summary if OpenAI is unavailable."""
        summary = " ".join(transcript_lines[:3])[:300]
        sentiment = "unknown"
        lead_score = 50
        return summary, sentiment, lead_score
    
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
