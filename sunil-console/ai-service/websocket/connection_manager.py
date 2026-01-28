"""
Device Connection Manager.

Manages active WebSocket connections to Windows devices and technicians.
Provides lookup by connection ID or chat session ID.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Dict, List, Optional, Set

if TYPE_CHECKING:
    from .device_handler import DeviceSession
    from .technician_handler import TechnicianSession

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
        self._technician_connections: Dict[int, Dict[int, "TechnicianSession"]] = {}  # ticket_id -> agent_id -> session
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

    # ============================================
    # Technician Connection Management
    # ============================================

    async def register_technician(
        self,
        ticket_id: int,
        agent_id: int,
        session: "TechnicianSession"
    ) -> None:
        """
        Register a technician connection.

        Args:
            ticket_id: Ticket the technician is joining
            agent_id: Support agent identifier
            session: The technician session handler
        """
        async with self._lock:
            if ticket_id not in self._technician_connections:
                self._technician_connections[ticket_id] = {}

            self._technician_connections[ticket_id][agent_id] = session

            logger.info(
                f"Technician registered: ticket={ticket_id}, agent={agent_id}, "
                f"total_on_ticket={len(self._technician_connections[ticket_id])}"
            )

    async def unregister_technician(self, ticket_id: int, agent_id: int) -> bool:
        """
        Unregister a technician connection.

        Args:
            ticket_id: Ticket the technician was on
            agent_id: Support agent identifier

        Returns:
            True if technician was found and removed
        """
        async with self._lock:
            if ticket_id not in self._technician_connections:
                return False

            if agent_id not in self._technician_connections[ticket_id]:
                return False

            del self._technician_connections[ticket_id][agent_id]
            logger.info(f"Technician unregistered: ticket={ticket_id}, agent={agent_id}")

            # Clean up empty ticket entries
            if not self._technician_connections[ticket_id]:
                del self._technician_connections[ticket_id]
                logger.debug(f"Removed empty ticket entry: {ticket_id}")

            return True

    def get_technicians_for_ticket(self, ticket_id: int) -> List["TechnicianSession"]:
        """
        Get all technicians connected to a ticket.

        Args:
            ticket_id: Ticket identifier

        Returns:
            List of TechnicianSession objects
        """
        if ticket_id in self._technician_connections:
            return list(self._technician_connections[ticket_id].values())
        return []

    async def broadcast_to_technicians(
        self,
        ticket_id: int,
        message_type: str,
        data: Dict[str, any]
    ) -> int:
        """
        Broadcast message to all technicians on a ticket.

        Args:
            ticket_id: Ticket to broadcast to
            message_type: Type of message (chat, command_update, etc.)
            data: Message data

        Returns:
            Number of technicians message was sent to
        """
        technicians = self.get_technicians_for_ticket(ticket_id)

        message = {"type": message_type, **data}
        sent_count = 0

        for tech_session in technicians:
            try:
                await tech_session._send_message(message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Error broadcasting to technician: {e}")

        if sent_count > 0:
            logger.debug(f"Broadcast to {sent_count} technician(s) on ticket {ticket_id}")

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
