"""
Conversation memory module for URackIT AI Service.

Manages conversation history and context for sessions.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class ConversationTurn:
    """A single turn in the conversation."""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)


class ConversationMemory:
    """Manages conversation history for a session."""

    def __init__(self, session_id: str, max_turns: int = 50):
        self.session_id = session_id
        self.max_turns = max_turns
        self.turns: List[ConversationTurn] = []
        self.context: Dict[str, Any] = {}
        self.created_at: datetime = datetime.utcnow()
        self.last_activity: datetime = datetime.utcnow()

        # Responses API: Store the last response ID for multi-turn context
        # This allows OpenAI to maintain conversation state server-side
        self.last_response_id: Optional[str] = None
    
    def add_turn(self, role: str, content: str, metadata: Optional[Dict] = None) -> None:
        """Add a conversation turn."""
        turn = ConversationTurn(
            role=role,
            content=content,
            metadata=metadata or {},
        )
        self.turns.append(turn)
        self.last_activity = datetime.utcnow()

        # Trim if exceeding max turns
        if len(self.turns) > self.max_turns:
            self.turns = self.turns[-self.max_turns:]
    
    def set_context(self, key: str, value: Any) -> None:
        """Set a context value (e.g., caller info, organization_id)."""
        self.context[key] = value
    
    def get_context(self, key: str, default: Any = None) -> Any:
        """Get a context value."""
        return self.context.get(key, default)
    
    def get_all_context(self) -> Dict[str, Any]:
        """Get all context values."""
        return self.context.copy()
    
    def get_recent_turns(self, count: int = 10) -> List[ConversationTurn]:
        """Get the most recent conversation turns."""
        return self.turns[-count:]
    
    def get_messages_for_api(self, count: int = 10) -> List[Dict[str, str]]:
        """Get recent turns formatted for OpenAI API."""
        return [
            {"role": turn.role, "content": turn.content}
            for turn in self.get_recent_turns(count)
        ]
    
    def get_summary(self) -> str:
        """Get a summary of the conversation context."""
        summary_parts = []

        if self.context.get("caller_name"):
            summary_parts.append(f"Caller: {self.context['caller_name']}")
        if self.context.get("organization_name"):
            summary_parts.append(f"Organization: {self.context['organization_name']}")
        if self.context.get("organization_id"):
            summary_parts.append(f"Org ID: {self.context['organization_id']}")
        if self.context.get("contact_id"):
            summary_parts.append(f"Contact ID: {self.context['contact_id']}")
        if self.context.get("callback_number"):
            summary_parts.append(f"Callback: {self.context['callback_number']}")
        if self.context.get("device_type"):
            summary_parts.append(f"Device: {self.context['device_type']}")
        if self.context.get("ticket_number"):
            summary_parts.append(f"Ticket: {self.context['ticket_number']}")

        return " | ".join(summary_parts) if summary_parts else "No context captured yet."

    def get_troubleshooting_context(self) -> Dict[str, Any]:
        """
        Extract troubleshooting context from conversation turns.

        Returns a dictionary containing:
        - issue_description: The main issue reported by the user
        - user_messages: List of user messages
        - ai_responses: List of AI responses
        - steps_taken: Extracted troubleshooting steps
        - context: All stored context values
        """
        user_messages = []
        ai_responses = []
        steps_taken = []
        step_number = 1

        for i, turn in enumerate(self.turns):
            if turn.role == "user":
                user_messages.append({
                    "content": turn.content,
                    "timestamp": turn.timestamp.isoformat(),
                })
            elif turn.role == "assistant":
                ai_responses.append({
                    "content": turn.content,
                    "timestamp": turn.timestamp.isoformat(),
                })

                # Extract step if it looks like a troubleshooting action
                content_lower = turn.content.lower()
                is_greeting = any(
                    phrase in content_lower
                    for phrase in ["hello", "hi there", "welcome", "how can i help"]
                ) and len(turn.content) < 100

                if not is_greeting:
                    # Find user response to this step
                    outcome = None
                    for j in range(i + 1, min(i + 3, len(self.turns))):
                        if self.turns[j].role == "user":
                            outcome = self.turns[j].content[:150]
                            break

                    steps_taken.append({
                        "step_number": step_number,
                        "description": turn.content[:200] + ("..." if len(turn.content) > 200 else ""),
                        "outcome": outcome,
                        "timestamp": turn.timestamp.isoformat(),
                    })
                    step_number += 1

        # Extract issue description from first user messages
        issue_description = ""
        if user_messages:
            first_messages = user_messages[:3]
            issue_description = " ".join([m["content"] for m in first_messages])[:300]

        return {
            "issue_description": issue_description,
            "user_messages": user_messages,
            "ai_responses": ai_responses,
            "steps_taken": steps_taken[:10],  # Limit to 10 steps
            "context": self.context.copy(),
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
        }
    
    def clear(self) -> None:
        """Clear all conversation history."""
        self.turns.clear()
        self.context.clear()


# Session memory storage
_session_memories: Dict[str, ConversationMemory] = {}


def get_memory(session_id: str) -> ConversationMemory:
    """Get or create memory for a session."""
    if session_id not in _session_memories:
        _session_memories[session_id] = ConversationMemory(session_id)
    return _session_memories[session_id]


def clear_memory(session_id: str) -> None:
    """Clear and remove memory for a session."""
    if session_id in _session_memories:
        del _session_memories[session_id]


def get_active_session_count() -> int:
    """Get the number of active sessions."""
    return len(_session_memories)


def cleanup_old_sessions(max_age_hours: int = 24) -> int:
    """Remove sessions older than max_age_hours."""
    cutoff = datetime.utcnow()
    removed = 0

    for session_id in list(_session_memories.keys()):
        memory = _session_memories[session_id]
        if memory.turns:
            last_turn = memory.turns[-1]
            age = (cutoff - last_turn.timestamp).total_seconds() / 3600
            if age > max_age_hours:
                del _session_memories[session_id]
                removed += 1

    return removed


def get_user_sessions(user_id: int) -> List[Dict[str, Any]]:
    """Get all sessions for a specific user."""
    user_sessions = []

    for session_id, memory in _session_memories.items():
        context_user_id = memory.context.get("userId") or memory.context.get("user_id")
        if context_user_id == user_id:
            # Get first user message as preview (skip greeting)
            preview = "New chat"
            for turn in memory.turns:
                if turn.role == "user":
                    preview = turn.content[:50] + ("..." if len(turn.content) > 50 else "")
                    break

            user_sessions.append({
                "session_id": session_id,
                "created_at": memory.created_at.isoformat(),
                "last_activity": memory.last_activity.isoformat(),
                "message_count": len(memory.turns),
                "preview": preview,
                "context": memory.get_all_context(),
            })

    # Sort by last activity, most recent first
    user_sessions.sort(key=lambda x: x["last_activity"], reverse=True)
    return user_sessions
