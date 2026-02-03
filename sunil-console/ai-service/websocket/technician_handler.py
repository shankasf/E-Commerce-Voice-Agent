"""
Technician WebSocket Handler for URackIT AI Service.

Handles WebSocket connections from technicians joining device chat sessions.
Provides full visibility into chat history and command execution history.
Enables technicians to send messages, execute commands, and collaborate with AI.
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import WebSocket, WebSocketDisconnect

from db.device_chat import get_device_chat_db
from db.connection import get_db
from services.summary_generator import get_summary_generator

from .config import get_ws_config
from .connection_manager import get_connection_manager
from .models import ChatMessage, ErrorMessage
from memory import get_memory

# Safe diagnostic commands that don't require user consent (read-only)
SAFE_COMMAND_PREFIXES: List[str] = [
    # PowerShell Get commands (read-only)
    "get-", "test-", "measure-", "select-", "where-", "format-", "sort-",
    "convertto-", "out-string", "write-output",
    # Network diagnostics
    "ipconfig", "ping", "nslookup", "tracert", "netstat", "arp",
    # System info (read-only)
    "hostname", "whoami", "systeminfo", "tasklist", "wmic",
    # Disk info
    "dir", "ls", "type", "cat",
]

logger = logging.getLogger(__name__)


class TechnicianSession:
    """
    Manages a single technician WebSocket connection for joining device chats.

    Enables technicians to:
    - View full chat history and command execution history
    - Send messages to users (all technicians)
    - Execute commands on devices (primary assignee only)
    - Collaborate with AI agent via instructions (primary assignee only)

    Lifecycle:
    1. Accept WebSocket connection
    2. Wait for auth message with JWT token, ticket_id, agent_id
    3. Validate authentication and ticket assignment
    4. Send initial state (chat history + execution history)
    5. Register with connection manager
    6. Notify device that technician joined (displays technician name)
    7. Enter message loop (handle chat, commands, AI instructions)
    8. Cleanup on disconnect

    Features:
    - Full chat history on join
    - Full command execution history
    - Real-time message broadcasting from device/AI
    - Send messages to device chat
    - Execute PowerShell commands (primary only)
    - Guide AI with instructions (primary only)
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

        handlers = {
            "heartbeat": self._on_heartbeat,
            "chat": self._on_chat,
            "execute_command": self._on_execute_command,
            "ai_instruction": self._on_ai_instruction,
        }

        handler = handlers.get(msg_type)
        if handler:
            await handler(data)
        else:
            logger.debug(f"[TECH-WS] Unknown message type: {msg_type}")

    # ============================================
    # Message Handlers
    # ============================================

    async def _on_heartbeat(self, _: Dict[str, Any]) -> None:
        """Handle heartbeat from technician."""
        self.last_heartbeat = datetime.utcnow()
        await self._send_message({"type": "heartbeat_ack"})

    async def _on_chat(self, data: Dict[str, Any]) -> None:
        """
        Handle chat message from technician.

        All technicians (primary and secondary) can send chat messages.
        Messages are saved to database, sent to device, and broadcast to other technicians.
        If ask_ai=True (primary only), the message also triggers AI processing.
        """
        content = data.get("content", "").strip()
        if not content:
            await self._send_error("Message content is required")
            return

        # Check if AI assistance is requested (primary assignee only)
        ask_ai = data.get("ask_ai", False) and self.is_primary_assignee

        # Get agent name for metadata
        agent_name = self._get_agent_name()
        metadata = {
            "agent_name": agent_name,
            "agent_id": self.agent_id,
            "ask_ai": ask_ai
        }

        # Save to database
        try:
            await self._chat_db.save_chat_message(
                chat_session_id=self.chat_session_id,
                ticket_id=self.ticket_id,
                device_id=self.device_id,
                sender_type="human_agent",
                sender_agent_id=self.agent_id,
                content=content,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"[TECH-WS] Failed to save chat message: {e}")

        # Get connection manager and device session
        conn_mgr = get_connection_manager()
        device_session = conn_mgr.get_by_chat_session(self.chat_session_id)

        # Send to device
        if device_session and device_session.is_connected:
            await device_session.send_chat(
                content=content,
                role="human_agent",
                metadata=metadata
            )
        else:
            logger.warning(f"[TECH-WS] Device not connected for chat_session={self.chat_session_id}")

        # Broadcast to all technicians on same ticket (including sender so they see their message)
        await conn_mgr.broadcast_to_technicians(
            ticket_id=self.ticket_id,
            message_type="chat",
            data={
                "role": "human_agent",
                "content": content,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": metadata
            }
        )

        logger.info(f"[TECH-WS] Chat message sent: agent={self.agent_id}, ask_ai={ask_ai}, content={content[:50]}...")

        # If AI assistance requested, add to memory and trigger AI processing
        if ask_ai and device_session and device_session.is_connected:
            # Format as technician request for AI - make it clear this is a SUPPORT TECHNICIAN
            # with authority to execute commands, not the customer
            ai_prompt = (
                f"[SUPPORT TECHNICIAN REQUEST from {agent_name}]: {content}\n\n"
                f"NOTE: This message is from a SUPPORT TECHNICIAN (not the customer). "
                f"The technician has authority to execute diagnostic commands without asking for permission. "
                f"Respond professionally to the technician with technical details and execute any requested diagnostics immediately."
            )

            # Add to memory so AI has context
            memory = get_memory(self.chat_session_id)
            memory.add_turn("user", ai_prompt)

            # Trigger AI response
            try:
                await device_session._process_ai_response(ai_prompt)
                logger.info(f"[TECH-WS] AI processing triggered for technician question")
            except Exception as e:
                logger.error(f"[TECH-WS] Failed to process AI response: {e}")

    async def _on_execute_command(self, data: Dict[str, Any]) -> None:
        """
        Handle command execution request from technician.

        Only primary assignee can execute commands.
        Safe commands (read-only diagnostics) run without user consent.
        Unsafe commands require user approval via consent dialog.
        """
        # Only primary assignee can execute commands
        if not self.is_primary_assignee:
            await self._send_error("Only primary assignee can execute commands")
            return

        command = data.get("command", "").strip()
        description = data.get("description", "").strip()

        if not command:
            await self._send_error("Command is required")
            return

        # Generate unique command ID
        command_id = str(uuid.uuid4())

        # Determine if command requires user consent
        requires_consent = self._check_command_requires_consent(command)

        # Get device session
        conn_mgr = get_connection_manager()
        device_session = conn_mgr.get_by_chat_session(self.chat_session_id)

        if not device_session or not device_session.is_connected:
            await self._send_error("Device is not connected")
            return

        # Get agent name for description
        agent_name = self._get_agent_name()
        full_description = description or f"Command requested by {agent_name}"

        # Send command to device
        sent = await device_session.send_powershell_command(
            command_id=command_id,
            command=command,
            description=full_description,
            requires_consent=requires_consent,
            requester_type="human_agent",
            requester_agent_id=self.agent_id
        )

        if not sent:
            await self._send_error("Failed to send command to device")
            return

        logger.info(
            f"[TECH-WS] Command sent: agent={self.agent_id}, command_id={command_id}, "
            f"consent_required={requires_consent}, command={command[:50]}..."
        )

    async def _on_ai_instruction(self, data: Dict[str, Any]) -> None:
        """
        Handle AI instruction from technician.

        Primary assignee can guide the AI agent to perform specific actions
        like running diagnostics or analyzing issues. The instruction is
        saved to database, broadcast to technicians, added to memory,
        and then triggers AI processing.
        """
        # Only primary assignee can instruct AI
        if not self.is_primary_assignee:
            await self._send_error("Only primary assignee can guide AI")
            return

        instruction = data.get("instruction", "").strip()
        if not instruction:
            await self._send_error("Instruction is required")
            return

        # Get agent name
        agent_name = self._get_agent_name()

        # Format instruction as a technician directive - make it clear this is from a SUPPORT TECHNICIAN
        formatted_instruction = (
            f"[SUPPORT TECHNICIAN INSTRUCTION from {agent_name}]: {instruction}\n\n"
            f"NOTE: Execute this instruction immediately. The technician has full authority to run diagnostics and commands. "
            f"Do not ask for permission - proceed with the requested action."
        )

        # Get device session
        conn_mgr = get_connection_manager()
        device_session = conn_mgr.get_by_chat_session(self.chat_session_id)

        if not device_session or not device_session.is_connected:
            await self._send_error("Device is not connected")
            return

        # Save instruction to database (for audit trail)
        metadata = {
            "agent_name": agent_name,
            "agent_id": self.agent_id,
            "type": "ai_instruction"
        }
        try:
            await self._chat_db.save_chat_message(
                chat_session_id=self.chat_session_id,
                ticket_id=self.ticket_id,
                device_id=self.device_id,
                sender_type="human_agent",
                sender_agent_id=self.agent_id,
                content=formatted_instruction,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"[TECH-WS] Failed to save AI instruction: {e}")

        # Broadcast to all technicians (including sender) so they see the instruction
        await conn_mgr.broadcast_to_technicians(
            ticket_id=self.ticket_id,
            message_type="chat",
            data={
                "role": "human_agent",
                "content": formatted_instruction,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": metadata
            }
        )

        # Add to memory so AI has full context
        memory = get_memory(self.chat_session_id)
        memory.add_turn("user", formatted_instruction)

        # Process through AI
        try:
            await device_session._process_ai_response(formatted_instruction)
            logger.info(f"[TECH-WS] AI instruction sent: agent={self.agent_id}, instruction={instruction[:50]}...")
        except Exception as e:
            logger.error(f"[TECH-WS] Failed to process AI instruction: {e}")
            await self._send_error("Failed to send instruction to AI")

    def _check_command_requires_consent(self, command: str) -> bool:
        """
        Determine if a command requires user consent.

        Safe commands (read-only diagnostics) don't require consent.
        Unsafe commands (modifications, restarts, deletions) require user approval.

        Args:
            command: The PowerShell command to check

        Returns:
            True if user consent is required, False for safe commands
        """
        command_lower = command.strip().lower()

        # Check if command starts with any safe prefix
        for prefix in SAFE_COMMAND_PREFIXES:
            if command_lower.startswith(prefix):
                return False

        # Default: require consent for safety
        return True

    def _get_agent_name(self) -> str:
        """Get the agent's full name from database."""
        try:
            agent = self._db.select(
                "support_agents",
                filters={"support_agent_id": f"eq.{self.agent_id}"}
            )
            return agent[0]["full_name"] if agent else "Technician"
        except Exception:
            return "Technician"

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
