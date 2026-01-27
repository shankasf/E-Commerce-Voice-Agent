"""
ToolResultStore - Session-scoped storage for tool results.

Stores the actual data returned by tools so we can validate
AI responses against real data and prevent hallucination.
"""

import json
import logging
import threading
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


class ToolResultStore:
    """
    Stores tool results per session for validation purposes.

    When a tool like prepare_ticket_context returns locations/devices,
    we store them here. Later, when the AI generates a response,
    we can validate that it only mentions options that actually exist.

    Thread-safe and includes automatic cleanup of old sessions.
    """

    # Tools that return validatable data
    TRACKED_TOOLS = {
        "prepare_ticket_context": ["locations", "devices"],
        "get_organization_locations": ["locations"],
        "get_user_devices": ["devices"],
        "get_contact_devices": ["devices"],
        "create_ticket_smart": ["ticket_id"],  # Track ticket creation
    }

    # How long to keep session data (in minutes)
    SESSION_TTL_MINUTES = 60

    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._timestamps: Dict[str, datetime] = {}
        self._lock = threading.RLock()

    def save_result(self, session_id: str, tool_name: str, result: str) -> None:
        """
        Save a tool result for later validation.

        Args:
            session_id: The session/conversation ID
            tool_name: Name of the tool that was called
            result: The raw result string from the tool (usually JSON)
        """
        if tool_name not in self.TRACKED_TOOLS:
            return

        try:
            # Parse the result if it's JSON
            if isinstance(result, str):
                try:
                    parsed = json.loads(result)
                except json.JSONDecodeError:
                    logger.warning(f"Could not parse tool result as JSON: {result[:100]}")
                    return
            else:
                parsed = result

            with self._lock:
                if session_id not in self._store:
                    self._store[session_id] = {
                        "locations": [],
                        "devices": [],
                        "location_names": set(),
                        "device_names": set(),
                        "_user_messages": {},
                        "_validation": {},
                        "tickets_created": [],  # Track created ticket IDs
                        "current_issue": None,  # Track the current issue being worked on
                    }

                session_data = self._store[session_id]
                self._timestamps[session_id] = datetime.now()

                # Extract locations
                if "locations" in parsed and isinstance(parsed["locations"], list):
                    session_data["locations"] = parsed["locations"]
                    session_data["location_names"] = {
                        loc.get("name", "").lower().strip()
                        for loc in parsed["locations"]
                        if loc.get("name")
                    }
                    logger.info(f"[ToolResultStore] Stored {len(parsed['locations'])} locations for session {session_id}")

                # Extract devices
                if "devices" in parsed and isinstance(parsed["devices"], list):
                    session_data["devices"] = parsed["devices"]
                    session_data["device_names"] = {
                        dev.get("name", "").lower().strip()
                        for dev in parsed["devices"]
                        if dev.get("name")
                    }
                    logger.info(f"[ToolResultStore] Stored {len(parsed['devices'])} devices for session {session_id}")

                # Store pre-formatted messages if present
                if "_user_messages" in parsed:
                    session_data["_user_messages"] = parsed["_user_messages"]

                # Store validation metadata if present
                if "_validation" in parsed:
                    session_data["_validation"] = parsed["_validation"]

                # Track ticket creation (for deduplication)
                if tool_name == "create_ticket_smart":
                    # Extract ticket_id from result string like "Ticket created successfully. Ticket ID: 13..."
                    import re
                    ticket_match = re.search(r'Ticket ID[:\s]*(\d+)', result if isinstance(result, str) else str(parsed))
                    if ticket_match:
                        ticket_id = int(ticket_match.group(1))
                        if "tickets_created" not in session_data:
                            session_data["tickets_created"] = []
                        session_data["tickets_created"].append(ticket_id)
                        logger.info(f"[ToolResultStore] Tracked ticket #{ticket_id} for session {session_id}. Total tickets: {len(session_data['tickets_created'])}")

        except Exception as e:
            logger.error(f"Error saving tool result: {e}")

    def get_valid_locations(self, session_id: str) -> List[Dict]:
        """Get the actual locations returned by tools for this session."""
        with self._lock:
            if session_id not in self._store:
                return []
            return self._store[session_id].get("locations", [])

    def get_valid_location_names(self, session_id: str) -> Set[str]:
        """Get lowercase location names for validation."""
        with self._lock:
            if session_id not in self._store:
                return set()
            return self._store[session_id].get("location_names", set())

    def get_valid_devices(self, session_id: str) -> List[Dict]:
        """Get the actual devices returned by tools for this session."""
        with self._lock:
            if session_id not in self._store:
                return []
            return self._store[session_id].get("devices", [])

    def get_valid_device_names(self, session_id: str) -> Set[str]:
        """Get lowercase device names for validation."""
        with self._lock:
            if session_id not in self._store:
                return set()
            return self._store[session_id].get("device_names", set())

    def get_user_message(self, session_id: str, message_key: str) -> Optional[str]:
        """
        Get a pre-formatted user message from the tool result.

        Args:
            session_id: The session ID
            message_key: Key like 'location_prompt', 'device_prompt', 'no_locations'

        Returns:
            The pre-formatted message or None if not found
        """
        with self._lock:
            if session_id not in self._store:
                return None
            return self._store[session_id].get("_user_messages", {}).get(message_key)

    def has_data_for_session(self, session_id: str) -> bool:
        """Check if we have any stored data for this session."""
        with self._lock:
            return session_id in self._store

    def get_tickets_created(self, session_id: str) -> List[int]:
        """Get list of ticket IDs created in this session."""
        with self._lock:
            if session_id not in self._store:
                return []
            return self._store[session_id].get("tickets_created", [])

    def has_ticket_for_session(self, session_id: str) -> bool:
        """Check if a ticket has already been created in this session."""
        return len(self.get_tickets_created(session_id)) > 0

    def get_ticket_count(self, session_id: str) -> int:
        """Get the number of tickets created in this session."""
        return len(self.get_tickets_created(session_id))

    def get_session_data(self, session_id: str) -> Optional[Dict]:
        """Get all stored data for a session (for debugging)."""
        with self._lock:
            return self._store.get(session_id)

    def clear_session(self, session_id: str) -> None:
        """Clear all stored data for a session."""
        with self._lock:
            self._store.pop(session_id, None)
            self._timestamps.pop(session_id, None)

    def cleanup_old_sessions(self) -> int:
        """
        Remove sessions older than SESSION_TTL_MINUTES.
        Returns the number of sessions cleaned up.
        """
        cutoff = datetime.now() - timedelta(minutes=self.SESSION_TTL_MINUTES)
        cleaned = 0

        with self._lock:
            expired = [
                sid for sid, ts in self._timestamps.items()
                if ts < cutoff
            ]
            for sid in expired:
                self._store.pop(sid, None)
                self._timestamps.pop(sid, None)
                cleaned += 1

        if cleaned > 0:
            logger.info(f"[ToolResultStore] Cleaned up {cleaned} expired sessions")

        return cleaned


# Global instance for use across the application
_global_store: Optional[ToolResultStore] = None
_store_lock = threading.Lock()


def get_tool_result_store() -> ToolResultStore:
    """Get or create the global ToolResultStore instance."""
    global _global_store
    with _store_lock:
        if _global_store is None:
            _global_store = ToolResultStore()
        return _global_store
