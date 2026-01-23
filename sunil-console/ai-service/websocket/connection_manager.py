"""
Device Connection Manager.

Manages active WebSocket connections to Windows devices.
Provides lookup by connection ID or chat session ID.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Dict, Optional, Set

if TYPE_CHECKING:
    from .device_handler import DeviceSession

logger = logging.getLogger(__name__)


@dataclass
class ConnectionStats:
    """Statistics about connection manager."""
    active_connections: int
    total_registered: int = 0
    total_unregistered: int = 0


class DeviceConnectionManager:
    """
    Manages active device WebSocket connections.

    Thread-safe for async operations. Provides O(1) lookup by
    connection_id and O(n) lookup by chat_session_id.

    Optimization: Add secondary index for chat_session_id if
    lookups become a bottleneck at scale.
    """

    def __init__(self):
        self._connections: Dict[str, "DeviceSession"] = {}
        self._lock = asyncio.Lock()
        self._stats = ConnectionStats(active_connections=0)

    async def register(self, connection_id: str, session: "DeviceSession") -> None:
        """
        Register a new authenticated connection.

        Args:
            connection_id: Unique connection identifier
            session: The device session handler
        """
        async with self._lock:
            if connection_id in self._connections:
                logger.warning(f"Connection already registered: {connection_id}")
                return

            self._connections[connection_id] = session
            self._stats.active_connections = len(self._connections)
            self._stats.total_registered += 1

            logger.info(
                f"Connection registered: {connection_id} "
                f"(active={self._stats.active_connections})"
            )

    async def unregister(self, connection_id: str) -> bool:
        """
        Unregister a connection.

        Args:
            connection_id: The connection to remove

        Returns:
            True if connection was found and removed
        """
        async with self._lock:
            if connection_id not in self._connections:
                return False

            del self._connections[connection_id]
            self._stats.active_connections = len(self._connections)
            self._stats.total_unregistered += 1

            logger.info(
                f"Connection unregistered: {connection_id} "
                f"(active={self._stats.active_connections})"
            )
            return True

    def get(self, connection_id: str) -> Optional["DeviceSession"]:
        """Get session by connection ID. O(1)."""
        return self._connections.get(connection_id)

    def get_by_chat_session(self, chat_session_id: str) -> Optional["DeviceSession"]:
        """
        Get session by chat session ID. O(n).

        Note: For high-traffic scenarios, consider adding a
        secondary index (dict) mapping chat_session_id -> connection_id.
        """
        for session in self._connections.values():
            if session.chat_session_id == chat_session_id:
                return session
        return None

    def get_active_count(self) -> int:
        """Get count of active connections."""
        return len(self._connections)

    def get_all_connection_ids(self) -> Set[str]:
        """Get all active connection IDs."""
        return set(self._connections.keys())

    def get_stats(self) -> ConnectionStats:
        """Get connection statistics."""
        return ConnectionStats(
            active_connections=len(self._connections),
            total_registered=self._stats.total_registered,
            total_unregistered=self._stats.total_unregistered,
        )

    async def broadcast(self, message: dict, exclude: Optional[str] = None) -> int:
        """
        Broadcast message to all connections.

        Args:
            message: Message dict to send
            exclude: Optional connection_id to exclude

        Returns:
            Number of connections message was sent to
        """
        sent_count = 0
        for conn_id, session in list(self._connections.items()):
            if conn_id == exclude:
                continue
            try:
                await session.send_message(message)
                sent_count += 1
            except Exception as e:
                logger.warning(f"Broadcast failed to {conn_id}: {e}")
        return sent_count


# Singleton instance
_manager: Optional[DeviceConnectionManager] = None


def get_connection_manager() -> DeviceConnectionManager:
    """Get the singleton connection manager instance."""
    global _manager
    if _manager is None:
        _manager = DeviceConnectionManager()
    return _manager


# Backwards compatibility alias
device_connection_manager = None


def _ensure_manager():
    """Ensure manager is initialized (for backwards compat)."""
    global device_connection_manager
    if device_connection_manager is None:
        device_connection_manager = get_connection_manager()
    return device_connection_manager


# Initialize on import for backwards compatibility
_ensure_manager()
