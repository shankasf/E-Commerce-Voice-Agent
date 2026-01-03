"""
WebSocket client for MCP backend communication.
"""
import asyncio
import json
import logging
from typing import Optional, Callable, Dict, Any
from datetime import datetime
import websockets
from websockets.exceptions import WebSocketException

from ..models import (
    ConnectionStatus,
    ToolCallMessage,
    ToolResultMessage,
)

logger = logging.getLogger(__name__)


class MCPClient:
    """WebSocket client for communicating with MCP backend."""

    def __init__(
        self,
        backend_url: str,
        jwt_token: str,
        device_id: str,
        reconnect_delay: int = 5,
        connection_timeout: int = 30,
    ):
        """
        Initialize MCP client.

        Args:
            backend_url: Backend WebSocket URL
            jwt_token: JWT authentication token
            device_id: Device ID
            reconnect_delay: Delay between reconnection attempts
            connection_timeout: Connection timeout in seconds
        """
        self._backend_url = backend_url
        self._jwt_token = jwt_token
        self._device_id = device_id
        self._reconnect_delay = reconnect_delay
        self._connection_timeout = connection_timeout

        self._websocket: Optional[websockets.WebSocketClientProtocol] = None
        self._is_running = False
        self._status = ConnectionStatus(
            is_connected=False,
            backend_url=backend_url,
        )

        self._message_handler: Optional[Callable] = None
        self._status_change_handler: Optional[Callable] = None

    def set_message_handler(self, handler: Callable):
        """Set handler for incoming tool call messages."""
        self._message_handler = handler

    def set_status_change_handler(self, handler: Callable):
        """Set handler for connection status changes."""
        self._status_change_handler = handler

    async def connect(self):
        """Establish WebSocket connection."""
        try:
            # Connect directly to the backend URL (already includes /ws/device/{device_id})
            logger.info(f"Connecting to MCP backend: {self._backend_url}")

            self._websocket = await asyncio.wait_for(
                websockets.connect(
                    self._backend_url,
                    ping_interval=30,
                    ping_timeout=10,
                ),
                timeout=self._connection_timeout,
            )

            self._status.is_connected = True
            self._status.last_connected = datetime.utcnow()
            self._status.last_error = None
            self._status.retry_count = 0

            logger.info("Connected to MCP backend")

            if self._status_change_handler:
                await self._status_change_handler(self._status)

        except asyncio.TimeoutError:
            error = f"Connection timeout after {self._connection_timeout}s"
            logger.error(error)
            self._status.is_connected = False
            self._status.last_error = error
            raise

        except Exception as e:
            error = f"Connection failed: {str(e)}"
            logger.error(error)
            self._status.is_connected = False
            self._status.last_error = error
            raise

    async def disconnect(self):
        """Close WebSocket connection."""
        self._is_running = False

        if self._websocket:
            try:
                await self._websocket.close()
            except Exception as e:
                logger.error(f"Error closing WebSocket: {e}")

        self._websocket = None
        self._status.is_connected = False

        logger.info("Disconnected from MCP backend")

        if self._status_change_handler:
            await self._status_change_handler(self._status)

    async def send_tool_result(self, result: ToolResultMessage):
        """
        Send tool execution result to backend.

        Args:
            result: Tool result message
        """
        if not self._websocket:
            raise RuntimeError("Not connected to backend")

        try:
            message = json.dumps(result.to_dict())
            await self._websocket.send(message)
            logger.debug(f"Sent tool result: {result.id}")

        except Exception as e:
            logger.error(f"Failed to send tool result: {e}")
            raise

    async def run(self):
        """Run the client with automatic reconnection."""
        self._is_running = True

        while self._is_running:
            try:
                await self.connect()
                await self._receive_loop()

            except Exception as e:
                logger.error(f"Connection error: {e}")
                self._status.retry_count += 1

                if self._is_running:
                    logger.info(
                        f"Reconnecting in {self._reconnect_delay}s "
                        f"(attempt {self._status.retry_count})..."
                    )
                    await asyncio.sleep(self._reconnect_delay)

    async def _receive_loop(self):
        """Receive and process messages from backend."""
        if not self._websocket:
            return

        try:
            async for message in self._websocket:
                await self._handle_message(message)

        except WebSocketException as e:
            logger.error(f"WebSocket error: {e}")
            self._status.is_connected = False
            self._status.last_error = str(e)

            if self._status_change_handler:
                await self._status_change_handler(self._status)

        except Exception as e:
            logger.error(f"Error in receive loop: {e}")
            raise

    async def _handle_message(self, message: str):
        """
        Handle incoming message from backend.

        Args:
            message: Raw message string
        """
        try:
            data = json.loads(message)
            message_type = data.get("type")

            logger.debug(f"Received message type: {message_type}")

            if message_type == "tool_call":
                # Parse and handle tool call
                tool_call = ToolCallMessage.from_dict(data)

                if self._message_handler:
                    await self._message_handler(tool_call)
                else:
                    logger.warning("No message handler registered for tool calls")

            elif message_type == "ping":
                # Respond to ping
                await self._websocket.send(json.dumps({"type": "pong"}))

            else:
                logger.warning(f"Unknown message type: {message_type}")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse message: {e}")

        except Exception as e:
            logger.error(f"Error handling message: {e}")

    def get_status(self) -> ConnectionStatus:
        """Get current connection status."""
        return self._status

    def is_connected(self) -> bool:
        """Check if connected to backend."""
        return self._status.is_connected

    async def stop(self):
        """Stop the client."""
        await self.disconnect()
