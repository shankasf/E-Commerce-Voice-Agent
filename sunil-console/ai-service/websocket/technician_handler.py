"""
Technician WebSocket Handler for URackIT AI Service.

Handles WebSocket connections from technicians joining device chat sessions.
Provides full visibility into chat history and command execution history.

NOTE: This is VIEW-ONLY mode. Technician sending messages and executing
commands will be added in a future branch.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect

from db.device_chat import get_device_chat_db
from db.connection import get_db
from services.summary_generator import get_summary_generator

from .config import get_ws_config
from .connection_manager import get_connection_manager
from .models import ChatMessage, ErrorMessage

logger = logging.getLogger(__name__)


class TechnicianSession:
    """
    Manages a single technician WebSocket connection for joining device chats.

    VIEW-ONLY MODE: Technician can see chat history and receive real-time updates,
    but cannot send messages or execute commands (to be added in future branch).

    Lifecycle:
    1. Accept WebSocket connection
    2. Wait for auth message with JWT token, ticket_id, agent_id
    3. Validate authentication and ticket assignment
    4. Send initial state (chat history + execution history)
    5. Register with connection manager
    6. Notify device that technician joined (displays technician name)
    7. Enter message loop (heartbeat only in view-only mode)
    8. Cleanup on disconnect

    Features:
    - Full chat history on join
    - Full command execution history (view only)
    - Real-time message broadcasting from device/AI
    - Technician name displayed when joining
    - Automatic session tracking in database
    """

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket

        # Load configuration
        self._config = get_ws_config()

        # Database clients
        self._chat_db = get_device_chat_db()
        self._db = get_db()

        # Connection state
        self.ticket_id: Optional[int] = None
        self.agent_id: Optional[int] = None
        self.chat_session_id: Optional[str] = None
        self.device_id: Optional[int] = None
        self.is_primary_assignee: bool = False

        # Status flags
        self.is_authenticated = False
        self.is_connected = False

        # Heartbeat tracking
        self.last_heartbeat: datetime = datetime.utcnow()

    # ============================================
    # Main Handler
    # ============================================

    async def handle(self) -> None:
        """Main entry point - handles entire connection lifecycle."""
        try:
            await self.websocket.accept()
            self.is_connected = True
            logger.info(f"[TECH-WS] Connection accepted")

            # Authenticate
            if not await self._authenticate():
                return

            # Send initial state (chat history + execution history)
            await self._send_initial_state()

            # Create technician session record
            await self._chat_db.create_technician_session(
                ticket_id=self.ticket_id,
                agent_id=self.agent_id,
                chat_session_id=self.chat_session_id
            )
            logger.info(f"[TECH-WS] Created technician session record")

            # Register in connection manager
            conn_mgr = get_connection_manager()
            await conn_mgr.register_technician(
                ticket_id=self.ticket_id,
                agent_id=self.agent_id,
                session=self
            )

            # Notify device that technician joined
            await self._notify_device_technician_joined()

            # Main message loop
            await self._message_loop()

        except WebSocketDisconnect:
            logger.info(f"[TECH-WS] Disconnected: ticket={self.ticket_id}, agent={self.agent_id}")
        except Exception as e:
            logger.error(f"[TECH-WS] Handler error: {e}", exc_info=True)
        finally:
            await self._cleanup()

    # ============================================
    # Authentication
    # ============================================

    async def _authenticate(self) -> bool:
        """Wait for and validate auth message."""
        auth_timeout = self._config.auth.timeout

        try:
            # Wait for auth message
            data = await asyncio.wait_for(
                self.websocket.receive_json(),
                timeout=auth_timeout
            )

            # Validate message type
            if data.get("type") != "auth":
                await self._send_error("Expected auth message")
                await self.websocket.close(code=4001)
                return False

            # Extract auth parameters
            jwt_token = data.get("jwt_token")
            self.ticket_id = data.get("ticket_id")
            self.agent_id = data.get("agent_id")

            if not all([jwt_token, self.ticket_id, self.agent_id]):
                await self._send_error("Missing auth parameters")
                await self.websocket.close(code=4001)
                return False

            # TODO: Validate JWT token
            # For now, simple validation against database

            # Verify agent exists
            agent = self._db.select(
                "support_agents",
                filters={"support_agent_id": f"eq.{self.agent_id}"}
            )

            if not agent:
                await self._send_error("Invalid agent")
                await self.websocket.close(code=4001)
                return False

            # Check if technician is assigned to ticket
            assignment = self._db.select(
                "ticket_assignments",
                filters={
                    "ticket_id": f"eq.{self.ticket_id}",
                    "support_agent_id": f"eq.{self.agent_id}"
                }
            )

            if not assignment:
                await self._send_error("Agent not assigned to ticket")
                await self.websocket.close(code=4003)
                return False

            # Check if primary assignee
            self.is_primary_assignee = assignment[0].get("is_primary", False) if assignment else False

            # Get ticket details
            ticket = self._db.select(
                "support_tickets",
                filters={"ticket_id": f"eq.{self.ticket_id}"}
            )

            if not ticket:
                await self._send_error("Ticket not found")
                await self.websocket.close(code=4004)
                return False

            # Get active device session for this ticket
            device_session = self._db.select(
                "device_sessions",
                filters={
                    "ticket_id": f"eq.{self.ticket_id}",
                    "is_active": "eq.true"
                },
                order="created_at.desc",
                limit=1
            )

            if not device_session:
                await self._send_error("No active device session for ticket")
                await self.websocket.close(code=4005)
                return False

            self.chat_session_id = device_session[0]["chat_session_id"]
            self.device_id = device_session[0]["device_id"]
            self.is_authenticated = True

            # Send auth success
            await self._send_message({
                "type": "auth_success",
                "ticket_id": self.ticket_id,
                "chat_session_id": self.chat_session_id,
                "device_id": self.device_id,
                "is_primary_assignee": self.is_primary_assignee
            })

            logger.info(
                f"[TECH-WS] Authenticated: agent={self.agent_id}, ticket={self.ticket_id}, "
                f"primary={self.is_primary_assignee}"
            )
            return True

        except asyncio.TimeoutError:
            logger.warning(f"[TECH-WS] Auth timeout")
            await self._send_error("Authentication timeout")
            await self.websocket.close(code=4001)
            return False

        except Exception as e:
            logger.error(f"[TECH-WS] Auth error: {e}")
            await self._send_error("Authentication failed")
            await self.websocket.close(code=4001)
            return False

    # ============================================
    # Initial State
    # ============================================

    async def _send_initial_state(self) -> None:
        """Send chat history, execution history, and issue summary to technician."""
        try:
            # Get chat history
            chat_history = await self._chat_db.get_chat_history(
                chat_session_id=self.chat_session_id,
                limit=100
            )

            # Get execution history
            execution_history = await self._chat_db.get_execution_history(
                chat_session_id=self.chat_session_id,
                limit=50
            )

            # Generate issue summary for technician
            logger.info(f"[TECH-WS] Generating summary for ticket_id={self.ticket_id}, chat_session_id={self.chat_session_id}")
            summary_generator = get_summary_generator()
            issue_summary = await summary_generator.generate_summary(
                chat_session_id=self.chat_session_id,
                ticket_id=self.ticket_id,
                use_ai_enhancement=True
            )
            logger.info(f"[TECH-WS] Summary issue_description: {issue_summary.issue_description[:100] if issue_summary.issue_description else 'None'}...")

            # Send to technician
            await self._send_message({
                "type": "initial_state",
                "chat_history": chat_history,
                "execution_history": execution_history,
                "issue_summary": issue_summary.to_dict()
            })

            logger.info(
                f"[TECH-WS] Sent initial state: {len(chat_history)} messages, "
                f"{len(execution_history)} executions, with issue summary"
            )

        except Exception as e:
            logger.error(f"[TECH-WS] Failed to send initial state: {e}")
            await self._send_error("Failed to load chat history")

    async def _notify_device_technician_joined(self) -> None:
        """Notify device that technician has joined the chat."""
        try:
            conn_mgr = get_connection_manager()
            device_session = conn_mgr.get_by_chat_session(self.chat_session_id)

            if device_session:
                # Get agent name
                agent = self._db.select(
                    "support_agents",
                    filters={"support_agent_id": f"eq.{self.agent_id}"}
                )
                agent_name = agent[0]["full_name"] if agent else "Technician"

                # Send system message to device
                await device_session.send_chat(
                    content=f"🔧 {agent_name} has joined the chat to assist you.",
                    role="system"
                )

                logger.info(f"[TECH-WS] Notified device that {agent_name} joined")

        except Exception as e:
            logger.error(f"[TECH-WS] Failed to notify device: {e}")

    # ============================================
    # Message Loop
    # ============================================

    async def _message_loop(self) -> None:
        """Process incoming messages until disconnect."""
        logger.info(f"[TECH-WS] Message loop started: agent={self.agent_id}, ticket={self.ticket_id}")

        while self.is_connected:
            try:
                data = await self.websocket.receive_json()
                await self._route_message(data)

            except WebSocketDisconnect:
                break
            except RuntimeError as e:
                if "not connected" in str(e).lower():
                    break
                logger.error(f"[TECH-WS] Runtime error: {e}")
                break
            except Exception as e:
                logger.error(f"[TECH-WS] Message error: {e}", exc_info=True)
                if not self.is_connected:
                    break

        logger.info(f"[TECH-WS] Message loop ended: agent={self.agent_id}")

    async def _route_message(self, data: Dict[str, Any]) -> None:
        """Route message to appropriate handler."""
        msg_type = data.get("type")

        # View-only mode: only heartbeat is handled
        # Chat and command execution will be added in a future branch
        handlers = {
            "heartbeat": self._on_heartbeat,
        }

        handler = handlers.get(msg_type)
        if handler:
            await handler(data)
        else:
            logger.debug(f"[TECH-WS] Message type not handled in view-only mode: {msg_type}")

    # ============================================
    # Message Handlers
    # ============================================

    async def _on_heartbeat(self, _: Dict[str, Any]) -> None:
        """Handle heartbeat from technician."""
        self.last_heartbeat = datetime.utcnow()
        await self._send_message({"type": "heartbeat_ack"})

    # NOTE: _on_chat method removed for view-only mode
    # Technician sending messages will be added in a future branch

    # NOTE: _on_execute_command and _check_command_requires_consent methods removed for view-only mode
    # Technician command execution will be added in a future branch

    # ============================================
    # Public API (called by ConnectionManager)
    # ============================================

    async def send_chat_message(
        self,
        content: str,
        sender_type: str,
        metadata: Optional[Dict] = None
    ) -> None:
        """
        Send chat message to technician (called from device/AI).

        Args:
            content: Message content
            sender_type: Who sent it (user, ai_agent, system)
            metadata: Optional metadata
        """
        message = {
            "type": "chat",
            "role": sender_type,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }
        await self._send_message(message)

    async def send_command_update(self, command_data: Dict[str, Any]) -> None:
        """
        Send command execution update to technician.

        Args:
            command_data: Command execution data with status, output, etc.
        """
        await self._send_message({
            "type": "command_update",
            **command_data
        })

    # ============================================
    # Helpers
    # ============================================

    async def _send_message(self, message: Dict[str, Any]) -> None:
        """Send message to technician WebSocket."""
        if not self.is_connected:
            return
        try:
            await self.websocket.send_json(message)
        except Exception as e:
            logger.error(f"[TECH-WS] Send failed: {e}")
            self.is_connected = False

    async def _send_error(self, error: str) -> None:
        """Send error message to technician."""
        await self._send_message({
            "type": "error",
            "error": error
        })

    # ============================================
    # Cleanup
    # ============================================

    async def _cleanup(self) -> None:
        """Clean up on disconnect."""
        logger.info(f"[TECH-WS] Cleanup starting: agent={self.agent_id}, ticket={self.ticket_id}")

        self.is_connected = False
        self.is_authenticated = False

        # Unregister from connection manager
        if self.ticket_id and self.agent_id:
            conn_mgr = get_connection_manager()
            await conn_mgr.unregister_technician(self.ticket_id, self.agent_id)

            # Close technician session in database
            try:
                await self._chat_db.close_technician_session(
                    ticket_id=self.ticket_id,
                    agent_id=self.agent_id
                )
                logger.info(f"[TECH-WS] Closed technician session in database")
            except Exception as e:
                logger.error(f"[TECH-WS] Failed to close technician session: {e}")

            # Notify device that technician left
            device_session = conn_mgr.get_by_chat_session(self.chat_session_id)
            if device_session:
                agent = self._db.select(
                    "support_agents",
                    filters={"support_agent_id": f"eq.{self.agent_id}"}
                )
                agent_name = agent[0]["full_name"] if agent else "Technician"

                await device_session.send_chat(
                    content=f"🔧 {agent_name} has left the chat.",
                    role="system"
                )
                logger.info(f"[TECH-WS] Notified device that {agent_name} left")

        try:
            await self.websocket.close()
        except:
            pass

        logger.info(f"[TECH-WS] Cleanup complete: agent={self.agent_id}")


# ============================================
# FastAPI Endpoint Handler
# ============================================

async def handle_technician_websocket(websocket: WebSocket) -> None:
    """
    FastAPI WebSocket endpoint handler for technicians.

    Usage in main.py:
        @app.websocket("/ws/technician")
        async def ws_technician(websocket: WebSocket):
            await handle_technician_websocket(websocket)
    """
    session = TechnicianSession(websocket)
    await session.handle()


__all__ = [
    "TechnicianSession",
    "handle_technician_websocket",
]
