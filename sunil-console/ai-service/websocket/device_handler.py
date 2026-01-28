"""
Device WebSocket Handler for URackIT AI Service.

Handles WebSocket connections from Windows app for remote device support.
Provides bidirectional communication between AI agent and Windows device.

Architecture:
- DeviceSession: Manages a single WebSocket connection lifecycle
- Uses config.py for centralized configuration
- Uses auth.py for code validation
- Uses connection_manager.py for session tracking
- Uses rate_limiter.py for brute-force protection
- Uses debounce.py for message batching
- Uses models.py for typed messages
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect

from memory import get_memory
from db.device_chat import get_device_chat_db
from db.connection import get_db

from .auth import (
    AuthParams,
    mark_connection_active,
    mark_connection_inactive,
    update_heartbeat,
    validate_connection_code,
)
from .config import get_ws_config
from .connection_manager import get_connection_manager
from .debounce import AITriggerDebouncer, DebounceConfig as DebounceConfigModel
from .models import (
    ChatHistory,
    ChatMessage,
    ConnectionEstablished,
    ErrorMessage,
    HeartbeatAck,
    PowerShellRequest,
)
from .rate_limiter import get_auth_rate_limiter

logger = logging.getLogger(__name__)


# ============================================
# Device Session Handler
# ============================================

class DeviceSession:
    """
    Manages a single device WebSocket connection.

    Lifecycle:
    1. Accept WebSocket connection
    2. Wait for auth message with 6-digit code
    3. Validate code and parameters
    4. Register with connection manager
    5. Send chat history
    6. Enter message loop (chat, heartbeat, command results)
    7. Cleanup on disconnect

    Features:
    - Configurable timeouts via environment variables
    - Message debouncing for rapid user input
    - Memory-safe pending command cleanup

    Public API for AI tools:
    - send_chat(): Send assistant message
    - send_powershell_command(): Request command execution
    - wait_for_command_result(): Wait for command completion
    """

    def __init__(self, websocket: WebSocket, client_ip: str):
        self.websocket = websocket
        self.client_ip = client_ip

        # Load configuration
        self._config = get_ws_config()

        # Database clients
        self._chat_db = get_device_chat_db()
        self._db = get_db()

        # Connection state
        self.connection_id: Optional[str] = None
        self.device_id: Optional[int] = None
        self.user_id: Optional[int] = None
        self.organization_id: Optional[int] = None
        self.chat_session_id: Optional[str] = None
        self.ticket_id: Optional[int] = None  # Linked ticket (auto-linked or manual)

        # Status flags
        self.is_authenticated = False
        self.is_connected = False

        # Heartbeat tracking
        self.last_heartbeat: datetime = datetime.utcnow()
        self._heartbeat_task: Optional[asyncio.Task] = None

        # Command result tracking
        self._pending_commands: Dict[str, asyncio.Event] = {}
        self._command_results: Dict[str, Dict[str, Any]] = {}

        # Message debouncer (initialized after auth)
        self._debouncer: Optional[AITriggerDebouncer] = None

    # ============================================
    # Main Handler
    # ============================================

    async def handle(self) -> None:
        """Main entry point - handles entire connection lifecycle."""
        try:
            await self.websocket.accept()
            self.is_connected = True
            logger.info(f"[WS] Connection accepted: ip={self.client_ip}")

            # Authenticate
            if not await self._authenticate():
                return

            # Register and setup
            await get_connection_manager().register(self.connection_id, self)
            await self._send_connection_established()
            await self._send_chat_history()

            # Initialize debouncer if enabled
            if self._config.debounce.enabled:
                self._debouncer = AITriggerDebouncer(
                    session_id=self.chat_session_id,
                    ai_callback=self._process_ai_response,
                    config=DebounceConfigModel(
                        delay=self._config.debounce.delay,
                        max_delay=self._config.debounce.max_delay,
                        max_batch_size=self._config.debounce.max_batch_size,
                    ),
                )

            # Start heartbeat monitor
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

            # Main message loop
            await self._message_loop()

        except WebSocketDisconnect:
            logger.info(f"[WS] Disconnected: {self.connection_id}")
        except Exception as e:
            logger.error(f"[WS] Handler error: {e}", exc_info=True)
        finally:
            await self._cleanup()

    # ============================================
    # Authentication
    # ============================================

    async def _authenticate(self) -> bool:
        """Wait for and validate auth message."""
        rate_limiter = get_auth_rate_limiter()
        auth_timeout = self._config.auth.timeout

        try:
            # Wait for auth message
            data = await asyncio.wait_for(
                self.websocket.receive_json(),
                timeout=auth_timeout
            )

            # Validate message type
            if data.get("type") != "auth":
                await self._send_error("AUTH_REQUIRED", "First message must be auth")
                await self.websocket.close(code=4001)
                return False

            # Check rate limit
            if not await rate_limiter.is_allowed(self.client_ip):
                await self._send_error("RATE_LIMITED", "Too many attempts")
                await self.websocket.close(code=4029)
                return False

            # Extract and validate params
            params = AuthParams(
                code=data.get("code", ""),
                user_id=data.get("user_id", 0),
                organization_id=data.get("organization_id", 0),
                device_id=data.get("device_id", 0),
            )

            if not all([params.code, params.user_id, params.organization_id, params.device_id]):
                await self._send_error("MISSING_PARAMS", "Missing required auth parameters")
                await self.websocket.close(code=4001)
                return False

            # Validate code
            result = await validate_connection_code(params)
            if not result.success:
                await self._send_error(result.error_code, result.error_message)
                await self.websocket.close(code=4001)
                return False

            # Store connection info
            self.connection_id = result.connection_id
            self.device_id = result.device_id
            self.user_id = result.user_id
            self.organization_id = result.organization_id
            self.chat_session_id = result.chat_session_id
            self.is_authenticated = True

            # Mark active in DB
            await mark_connection_active(self.connection_id)

            # Auto-link to most recent open ticket for this user
            try:
                tickets = self._db.select(
                    "support_tickets",
                    filters={
                        "contact_id": f"eq.{self.user_id}",
                        "status_id": f"in.(1,2,3,4)"  # Open, In Progress, Awaiting Customer, Escalated
                    },
                    order="created_at.desc",
                    limit=1
                )

                if tickets and len(tickets) > 0:
                    self.ticket_id = tickets[0]["ticket_id"]
                    logger.info(f"[WS] Auto-linked to ticket {self.ticket_id}")

            except Exception as e:
                logger.warning(f"[WS] Failed to auto-link ticket: {e}")

            # Create device session record in database
            try:
                await self._chat_db.create_device_session(
                    chat_session_id=self.chat_session_id,
                    ticket_id=self.ticket_id,
                    device_id=self.device_id,
                    user_id=self.user_id,
                    organization_id=self.organization_id
                )
                logger.info(f"[WS] Created device session record")
            except Exception as e:
                logger.error(f"[WS] Failed to create device session: {e}")

            # Reset rate limiter on success
            await rate_limiter.reset(self.client_ip)

            logger.info(f"[WS] Authenticated: conn={self.connection_id}, device={self.device_id}")
            return True

        except asyncio.TimeoutError:
            logger.warning(f"[WS] Auth timeout: ip={self.client_ip}")
            await self._send_error("AUTH_TIMEOUT", "Authentication timeout")
            await self.websocket.close(code=4001)
            return False

        except Exception as e:
            logger.error(f"[WS] Auth error: {e}")
            await self._send_error("AUTH_ERROR", "Authentication failed")
            await self.websocket.close(code=4001)
            return False

    # ============================================
    # Message Loop
    # ============================================

    async def _message_loop(self) -> None:
        """Process incoming messages until disconnect."""
        logger.info(f"[WS] Message loop started: {self.connection_id}")

        while self.is_connected:
            try:
                data = await self.websocket.receive_json()
                await self._route_message(data)

            except WebSocketDisconnect:
                break
            except RuntimeError as e:
                if "not connected" in str(e).lower():
                    break
                logger.error(f"[WS] Runtime error: {e}")
                break
            except Exception as e:
                logger.error(f"[WS] Message error: {e}", exc_info=True)
                if not self.is_connected:
                    break

        logger.info(f"[WS] Message loop ended: {self.connection_id}")

    async def _route_message(self, data: Dict[str, Any]) -> None:
        """Route message to appropriate handler."""
        msg_type = data.get("type")

        handlers = {
            "heartbeat": self._on_heartbeat,
            "chat": self._on_chat,
            "powershell_result": self._on_powershell_result,
        }

        handler = handlers.get(msg_type)
        if handler:
            await handler(data)
        else:
            logger.warning(f"[WS] Unknown message type: {msg_type}")

    # ============================================
    # Message Handlers
    # ============================================

    async def _on_heartbeat(self, _: Dict[str, Any]) -> None:
        """Handle heartbeat ping."""
        self.last_heartbeat = datetime.utcnow()
        await update_heartbeat(self.connection_id)
        await self._send_message(HeartbeatAck().model_dump())

    async def _on_chat(self, data: Dict[str, Any]) -> None:
        """Handle chat message from user."""
        content = data.get("content", "")
        if not content:
            return

        # Save to database
        try:
            await self._chat_db.save_chat_message(
                chat_session_id=self.chat_session_id,
                ticket_id=self.ticket_id,
                device_id=self.device_id,
                sender_type="user",
                content=content
            )
        except Exception as e:
            logger.error(f"[WS] Failed to save user message: {e}")

        # Broadcast to technicians if ticket is linked
        if self.ticket_id:
            try:
                conn_mgr = get_connection_manager()
                await conn_mgr.broadcast_to_technicians(
                    ticket_id=self.ticket_id,
                    message_type="chat",
                    data={
                        "role": "user",
                        "content": content,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
            except Exception as e:
                logger.error(f"[WS] Failed to broadcast user message to technicians: {e}")

        # Add to memory
        memory = get_memory(self.chat_session_id)
        memory.add_turn("user", content)
        logger.info(f"[WS] User message: {content[:50]}...")

        # Use debouncer if enabled, otherwise trigger directly
        if self._debouncer:
            await self._debouncer.on_user_message(content)
        else:
            # Direct trigger (non-blocking)
            asyncio.create_task(self._process_ai_response(content))

    async def _on_powershell_result(self, data: Dict[str, Any]) -> None:
        """Handle PowerShell command result."""
        command_id = data.get("command_id")
        status = data.get("status", "error")
        output = data.get("output")
        error = data.get("error")
        execution_time_ms = data.get("execution_time_ms")

        logger.info(f"[WS] Command result: id={command_id}, status={status}")

        # Update database
        try:
            await self._chat_db.update_command_status(
                command_id=command_id,
                status=status,
                output=output,
                error=error,
                execution_time_ms=execution_time_ms
            )
        except Exception as e:
            logger.error(f"[WS] Failed to update command status: {e}")

        # Broadcast to technicians if ticket is linked
        if self.ticket_id:
            try:
                conn_mgr = get_connection_manager()
                await conn_mgr.broadcast_to_technicians(
                    ticket_id=self.ticket_id,
                    message_type="command_update",
                    data={
                        "command_id": command_id,
                        "status": status,
                        "output": output,
                        "error": error,
                        "execution_time_ms": execution_time_ms
                    }
                )
            except Exception as e:
                logger.error(f"[WS] Failed to broadcast command update to technicians: {e}")

        # Store result
        self._command_results[command_id] = {
            "status": status,
            "output": output,
            "error": error,
            "reason": data.get("reason"),
        }

        # Signal waiting coroutine
        if command_id in self._pending_commands:
            self._pending_commands[command_id].set()

    # ============================================
    # AI Integration
    # ============================================

    async def _process_ai_response(self, user_message: str) -> None:
        """Run AI agent and send response (background task)."""
        try:
            from agents import Runner
            from app_agents import triage_agent

            memory = get_memory(self.chat_session_id)
            context = memory.get_all_context()

            # Add device context for command tools
            context.update({
                "device_id": self.device_id,
                "device_connected": True,
                "session_id": self.chat_session_id,
                "user_id": self.user_id,
                "organization_id": self.organization_id,
            })

            # Run agent
            result = await Runner.run(
                triage_agent,
                user_message,
                context=context,
                memory=memory,
            )

            # Store and send response
            memory.add_turn("assistant", result.final_output)
            await self.send_chat(result.final_output)

        except Exception as e:
            logger.error(f"[WS] AI error: {e}", exc_info=True)
            await self._send_error("AI_ERROR", f"AI response failed: {e}")

    # ============================================
    # Public API for AI Tools
    # ============================================

    async def send_chat(self, content: str, role: str = "assistant", metadata: Optional[Dict] = None) -> None:
        """
        Send chat message to device and save to database.

        Args:
            content: Message content
            role: Sender role (assistant, human_agent, system)
            metadata: Optional metadata (e.g., agent_name for human agents)
        """
        # Map role to database sender_type (database uses 'ai_agent', WebSocket uses 'assistant')
        db_sender_type = "ai_agent" if role == "assistant" else role

        # Save to database
        try:
            await self._chat_db.save_chat_message(
                chat_session_id=self.chat_session_id,
                ticket_id=self.ticket_id,
                device_id=self.device_id,
                sender_type=db_sender_type,
                content=content,
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"[WS] Failed to save {role} message: {e}")

        # Send to device (keep using original role for backward compatibility)
        msg = ChatMessage(
            role=role,
            content=content,
            timestamp=datetime.utcnow().isoformat(),
            metadata=metadata or {}
        )
        await self._send_message(msg.model_dump())

        # Broadcast to technicians if ticket is linked
        # Only broadcast AI agent and system messages (human_agent messages are already sent by technician)
        if self.ticket_id and role in ["assistant", "ai_agent", "system"]:
            try:
                conn_mgr = get_connection_manager()
                await conn_mgr.broadcast_to_technicians(
                    ticket_id=self.ticket_id,
                    message_type="chat",
                    data={
                        "role": db_sender_type,
                        "content": content,
                        "timestamp": msg.timestamp.isoformat() if isinstance(msg.timestamp, datetime) else msg.timestamp,
                        "metadata": metadata or {}
                    }
                )
            except Exception as e:
                logger.error(f"[WS] Failed to broadcast {role} message to technicians: {e}")

    async def send_message(self, data: Dict[str, Any]) -> None:
        """Send any message to device (public API for cleanup)."""
        await self._send_message(data)

    async def send_powershell_command(
        self,
        command_id: str,
        command: str,
        description: str,
        requires_consent: bool = True,
        requester_type: str = "ai_agent",
        requester_agent_id: Optional[int] = None,
    ) -> bool:
        """
        Request PowerShell command execution on device.

        Args:
            command_id: Unique command identifier
            command: PowerShell command to execute
            description: Human-readable description for user
            requires_consent: Whether user must approve
            requester_type: Who requested (ai_agent or human_agent)
            requester_agent_id: Agent ID if requester is a human agent

        Returns:
            True if request was sent successfully
        """
        if not self.is_connected:
            logger.warning(f"[WS] Cannot send command - disconnected: {command_id}")
            return False

        # Save to database
        try:
            await self._chat_db.save_command_execution(
                chat_session_id=self.chat_session_id,
                ticket_id=self.ticket_id,
                device_id=self.device_id,
                command_id=command_id,
                command=command,
                description=description,
                requester_type=requester_type,
                requester_agent_id=requester_agent_id
            )
        except Exception as e:
            logger.error(f"[WS] Failed to save command execution: {e}")

        # Broadcast to technicians if ticket is linked (notify them command was sent)
        if self.ticket_id:
            try:
                conn_mgr = get_connection_manager()
                await conn_mgr.broadcast_to_technicians(
                    ticket_id=self.ticket_id,
                    message_type="command_update",
                    data={
                        "command_id": command_id,
                        "command": command,
                        "description": description,
                        "status": "pending",
                        "requester_type": requester_type,
                        "requires_consent": requires_consent
                    }
                )
            except Exception as e:
                logger.error(f"[WS] Failed to broadcast command initiation to technicians: {e}")

        # Create event for result waiting
        self._pending_commands[command_id] = asyncio.Event()

        # Send request
        request = PowerShellRequest(
            command_id=command_id,
            command=command,
            description=description,
            requires_consent=requires_consent,
        )
        await self._send_message(request.model_dump())

        logger.info(f"[WS] Sent command: id={command_id}, consent={requires_consent}, requester={requester_type}")
        return True

    async def wait_for_command_result(
        self,
        command_id: str,
        timeout: int = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Wait for command result.

        Args:
            command_id: Command to wait for
            timeout: Timeout in seconds (uses config default if None)

        Returns:
            Result dict or None if timeout
        """
        if timeout is None:
            timeout = self._config.command.default_timeout

        # Cap timeout at max
        timeout = min(timeout, self._config.command.max_timeout)

        event = self._pending_commands.get(command_id)
        if not event:
            return None

        try:
            await asyncio.wait_for(event.wait(), timeout=timeout)
            result = self._command_results.get(command_id)
        except asyncio.TimeoutError:
            logger.warning(f"[WS] Command timeout: {command_id}")
            result = None
        finally:
            # Always cleanup to prevent memory leaks
            self._pending_commands.pop(command_id, None)
            self._command_results.pop(command_id, None)

        return result

    # ============================================
    # Helpers
    # ============================================

    async def _send_connection_established(self) -> None:
        """Send connection established message."""
        msg = ConnectionEstablished(
            device_id=self.device_id,
            user_id=self.user_id,
            chat_session_id=self.chat_session_id,
        )
        await self._send_message(msg.model_dump())

    async def _send_chat_history(self) -> None:
        """Send chat history to device."""
        try:
            memory = get_memory(self.chat_session_id)
            messages = [
                {
                    "role": turn.role,
                    "content": turn.content,
                    "timestamp": turn.timestamp.isoformat(),
                }
                for turn in memory.turns
            ]
            await self._send_message(ChatHistory(messages=messages).model_dump())
            logger.info(f"[WS] Sent {len(messages)} history messages")
        except Exception as e:
            logger.error(f"[WS] Failed to send history: {e}")

    async def _send_message(self, data: Dict[str, Any]) -> None:
        """Send JSON message to device."""
        if not self.is_connected:
            return
        try:
            await self.websocket.send_json(data)
        except Exception as e:
            logger.error(f"[WS] Send failed: {e}")
            self.is_connected = False

    async def _send_error(self, code: str, message: str) -> None:
        """Send error message."""
        msg = ErrorMessage(code=code, message=message)
        await self._send_message(msg.model_dump())

    # ============================================
    # Heartbeat & Cleanup
    # ============================================

    async def _heartbeat_loop(self) -> None:
        """Monitor heartbeat and disconnect on timeout."""
        interval = self._config.heartbeat.interval
        timeout = self._config.heartbeat.timeout

        while self.is_connected:
            await asyncio.sleep(interval)

            if not self.is_connected:
                break

            elapsed = (datetime.utcnow() - self.last_heartbeat).total_seconds()
            if elapsed > timeout:
                logger.warning(f"[WS] Heartbeat timeout: {self.connection_id}")
                self.is_connected = False
                try:
                    await self.websocket.close(code=4002)
                except Exception:
                    pass
                break

    async def _cleanup(self) -> None:
        """Clean up on disconnect."""
        logger.info(f"[WS] Cleanup starting: {self.connection_id}")

        self.is_connected = False
        self.is_authenticated = False

        # Cancel heartbeat
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass

        # Flush any pending debounced messages
        if self._debouncer:
            self._debouncer.cancel()

        # Signal pending commands with disconnect error
        for command_id, event in list(self._pending_commands.items()):
            self._command_results[command_id] = {
                "status": "error",
                "error": "Device disconnected",
                "output": None,
                "reason": "Connection closed",
            }
            event.set()

        # Clear pending data to free memory
        self._pending_commands.clear()
        self._command_results.clear()

        # Update DB and unregister
        if self.connection_id:
            await mark_connection_inactive(self.connection_id)
            await get_connection_manager().unregister(self.connection_id)

        # Close device session in database
        if self.chat_session_id:
            try:
                await self._chat_db.close_device_session(self.chat_session_id)
                logger.info(f"[WS] Closed device session in database")
            except Exception as e:
                logger.error(f"[WS] Failed to close device session: {e}")

        logger.info(f"[WS] Cleanup complete: {self.connection_id}")


# ============================================
# FastAPI Endpoint Handler
# ============================================

async def handle_device_websocket(websocket: WebSocket, client_ip: str) -> None:
    """
    FastAPI WebSocket endpoint handler.

    Usage in main.py:
        @app.websocket("/ws/device")
        async def ws_device(websocket: WebSocket):
            client_ip = websocket.client.host
            await handle_device_websocket(websocket, client_ip)
    """
    session = DeviceSession(websocket, client_ip)
    await session.handle()


# ============================================
# Backwards Compatibility
# ============================================

# Alias for existing imports
DeviceWebSocketHandler = DeviceSession

# Re-export connection manager for tools/device.py
from .connection_manager import device_connection_manager

__all__ = [
    "DeviceSession",
    "DeviceWebSocketHandler",
    "handle_device_websocket",
    "device_connection_manager",
]
