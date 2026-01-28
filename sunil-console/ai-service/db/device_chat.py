"""
Device Chat Database Operations.

Provides database operations for device chat messages, terminal command executions,
device sessions, and technician sessions.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from .connection import get_db

logger = logging.getLogger(__name__)


class DeviceChatDB:
    """Database operations for device chat and execution history."""

    def __init__(self):
        self.db = get_db()

    # ==========================================
    # CHAT MESSAGE OPERATIONS
    # ==========================================

    async def save_chat_message(
        self,
        chat_session_id: str,
        ticket_id: Optional[int],
        device_id: int,
        sender_type: str,
        content: str,
        sender_agent_id: Optional[int] = None,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Save a chat message to database.

        Args:
            chat_session_id: Unique chat session identifier
            ticket_id: Associated ticket ID (optional)
            device_id: Device identifier
            sender_type: Type of sender ('user', 'ai_agent', 'human_agent', 'system')
            content: Message content
            sender_agent_id: Agent ID if sender is an agent (optional)
            metadata: Additional metadata like agent_name, etc. (optional)

        Returns:
            Inserted message record
        """
        try:
            result = self.db.insert("device_chat_messages", {
                "chat_session_id": chat_session_id,
                "ticket_id": ticket_id,
                "device_id": device_id,
                "sender_type": sender_type,
                "sender_agent_id": sender_agent_id,
                "content": content,
                "metadata": metadata or {}
            })
            logger.debug(f"Saved chat message for session {chat_session_id}, sender: {sender_type}")
            return result[0] if result else {}
        except Exception as e:
            logger.error(f"Error saving chat message: {e}")
            raise

    async def get_chat_history(
        self,
        chat_session_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get chat history for a session.

        Args:
            chat_session_id: Unique chat session identifier
            limit: Maximum number of messages to retrieve

        Returns:
            List of chat messages ordered by time (oldest first)
        """
        try:
            result = self.db.select(
                "device_chat_messages",
                filters={"chat_session_id": f"eq.{chat_session_id}"},
                order="message_time.asc",
                limit=limit
            )
            logger.debug(f"Retrieved {len(result)} messages for session {chat_session_id}")
            return result
        except Exception as e:
            logger.error(f"Error getting chat history: {e}")
            return []

    # ==========================================
    # COMMAND EXECUTION OPERATIONS
    # ==========================================

    async def save_command_execution(
        self,
        chat_session_id: str,
        ticket_id: Optional[int],
        device_id: int,
        command_id: str,
        command: str,
        description: str,
        requester_type: str,
        requester_agent_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Save a command execution request.

        Args:
            chat_session_id: Unique chat session identifier
            ticket_id: Associated ticket ID (optional)
            device_id: Device identifier
            command_id: Unique command execution identifier
            command: PowerShell/terminal command
            description: Human-readable command description
            requester_type: Who requested ('ai_agent' or 'human_agent')
            requester_agent_id: Agent ID if requester is an agent (optional)

        Returns:
            Inserted execution record
        """
        try:
            result = self.db.insert("device_command_executions", {
                "chat_session_id": chat_session_id,
                "ticket_id": ticket_id,
                "device_id": device_id,
                "command_id": command_id,
                "command": command,
                "description": description,
                "requester_type": requester_type,
                "requester_agent_id": requester_agent_id,
                "status": "pending"
            })
            logger.debug(f"Saved command execution {command_id} for session {chat_session_id}")
            return result[0] if result else {}
        except Exception as e:
            logger.error(f"Error saving command execution: {e}")
            raise

    async def update_command_status(
        self,
        command_id: str,
        status: str,
        output: Optional[str] = None,
        error: Optional[str] = None,
        execution_time_ms: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Update command execution status and results.

        Args:
            command_id: Unique command execution identifier
            status: New status ('pending', 'running', 'success', 'error', 'declined', 'timeout')
            output: Command stdout (optional)
            error: Command stderr (optional)
            execution_time_ms: Execution duration in milliseconds (optional)

        Returns:
            Updated execution record
        """
        try:
            data = {"status": status}

            # Set completed_at for final statuses
            if status in ["success", "error", "declined", "timeout"]:
                data["completed_at"] = datetime.utcnow().isoformat()

            if output is not None:
                data["output"] = output
            if error is not None:
                data["error"] = error
            if execution_time_ms is not None:
                data["execution_time_ms"] = execution_time_ms

            result = self.db.update(
                "device_command_executions",
                data,
                filters={"command_id": f"eq.{command_id}"}
            )
            logger.debug(f"Updated command {command_id} status to {status}")
            return result[0] if result else {}
        except Exception as e:
            logger.error(f"Error updating command status: {e}")
            raise

    async def get_execution_history(
        self,
        chat_session_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get command execution history for a session.

        Args:
            chat_session_id: Unique chat session identifier
            limit: Maximum number of executions to retrieve

        Returns:
            List of command executions ordered by time (oldest first)
        """
        try:
            result = self.db.select(
                "device_command_executions",
                filters={"chat_session_id": f"eq.{chat_session_id}"},
                order="created_at.asc",
                limit=limit
            )
            logger.debug(f"Retrieved {len(result)} command executions for session {chat_session_id}")
            return result
        except Exception as e:
            logger.error(f"Error getting execution history: {e}")
            return []

    # ==========================================
    # DEVICE SESSION OPERATIONS
    # ==========================================

    async def create_device_session(
        self,
        chat_session_id: str,
        ticket_id: Optional[int],
        device_id: int,
        user_id: int,
        organization_id: int
    ) -> Dict[str, Any]:
        """
        Create a device session record.

        Args:
            chat_session_id: Unique chat session identifier
            ticket_id: Associated ticket ID (optional, auto-linked if available)
            device_id: Device identifier
            user_id: User/contact identifier
            organization_id: Organization identifier

        Returns:
            Created session record
        """
        try:
            result = self.db.insert("device_sessions", {
                "chat_session_id": chat_session_id,
                "ticket_id": ticket_id,
                "device_id": device_id,
                "user_id": user_id,
                "organization_id": organization_id,
                "is_active": True
            })
            logger.info(f"Created device session {chat_session_id} for device {device_id}")
            return result[0] if result else {}
        except Exception as e:
            logger.error(f"Error creating device session: {e}")
            raise

    async def update_session_heartbeat(self, chat_session_id: str) -> None:
        """
        Update last heartbeat timestamp for a device session.

        Args:
            chat_session_id: Unique chat session identifier
        """
        try:
            self.db.update(
                "device_sessions",
                {"last_heartbeat": datetime.utcnow().isoformat()},
                filters={"chat_session_id": f"eq.{chat_session_id}"}
            )
            logger.debug(f"Updated heartbeat for session {chat_session_id}")
        except Exception as e:
            logger.error(f"Error updating session heartbeat: {e}")

    async def close_device_session(self, chat_session_id: str) -> None:
        """
        Mark device session as inactive.

        Args:
            chat_session_id: Unique chat session identifier
        """
        try:
            self.db.update(
                "device_sessions",
                {
                    "is_active": False,
                    "disconnected_at": datetime.utcnow().isoformat()
                },
                filters={"chat_session_id": f"eq.{chat_session_id}"}
            )
            logger.info(f"Closed device session {chat_session_id}")
        except Exception as e:
            logger.error(f"Error closing device session: {e}")

    async def get_device_session_by_ticket(
        self,
        ticket_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get active device session for a ticket.

        Args:
            ticket_id: Ticket identifier

        Returns:
            Device session record or None
        """
        try:
            result = self.db.select(
                "device_sessions",
                filters={
                    "ticket_id": f"eq.{ticket_id}",
                    "is_active": "eq.true"
                },
                order="created_at.desc",
                limit=1
            )
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error getting device session by ticket: {e}")
            return None

    # ==========================================
    # TECHNICIAN SESSION OPERATIONS
    # ==========================================

    async def create_technician_session(
        self,
        ticket_id: int,
        agent_id: int,
        chat_session_id: str
    ) -> Dict[str, Any]:
        """
        Create a technician session record.

        Args:
            ticket_id: Associated ticket ID
            agent_id: Support agent identifier
            chat_session_id: Chat session the technician is joining

        Returns:
            Created technician session record
        """
        try:
            result = self.db.insert("technician_sessions", {
                "ticket_id": ticket_id,
                "agent_id": agent_id,
                "chat_session_id": chat_session_id,
                "is_active": True
            })
            logger.info(f"Technician {agent_id} joined ticket {ticket_id} chat session")
            return result[0] if result else {}
        except Exception as e:
            logger.error(f"Error creating technician session: {e}")
            raise

    async def close_technician_session(
        self,
        ticket_id: int,
        agent_id: int
    ) -> None:
        """
        Mark technician session as inactive.

        Args:
            ticket_id: Associated ticket ID
            agent_id: Support agent identifier
        """
        try:
            self.db.update(
                "technician_sessions",
                {
                    "is_active": False,
                    "left_at": datetime.utcnow().isoformat()
                },
                filters={
                    "ticket_id": f"eq.{ticket_id}",
                    "agent_id": f"eq.{agent_id}",
                    "is_active": f"eq.true"
                }
            )
            logger.info(f"Technician {agent_id} left ticket {ticket_id} chat session")
        except Exception as e:
            logger.error(f"Error closing technician session: {e}")

    async def get_active_technicians_for_ticket(
        self,
        ticket_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get all active technicians for a ticket.

        Args:
            ticket_id: Ticket identifier

        Returns:
            List of active technician sessions
        """
        try:
            result = self.db.select(
                "technician_sessions",
                filters={
                    "ticket_id": f"eq.{ticket_id}",
                    "is_active": "eq.true"
                },
                order="joined_at.asc"
            )
            logger.debug(f"Found {len(result)} active technicians for ticket {ticket_id}")
            return result
        except Exception as e:
            logger.error(f"Error getting active technicians: {e}")
            return []


# ==========================================
# MODULE-LEVEL SINGLETON
# ==========================================
_device_chat_db: Optional[DeviceChatDB] = None


def get_device_chat_db() -> DeviceChatDB:
    """Get the singleton DeviceChatDB instance."""
    global _device_chat_db
    if _device_chat_db is None:
        _device_chat_db = DeviceChatDB()
    return _device_chat_db
