"""
Notification service with GUI/CLI fallback support.
"""
import logging
import subprocess
from typing import Optional
from enum import Enum

from ..models import Role, RiskLevel

logger = logging.getLogger(__name__)


class NotificationMethod(Enum):
    """Available notification methods."""
    NOTIFY_SEND = "notify-send"
    TERMINAL = "terminal"
    NONE = "none"


class NotificationService:
    """Desktop notifications (GUI) and terminal output (CLI)."""

    def __init__(self, use_gui: bool = True):
        """
        Initialize notification service.

        Args:
            use_gui: Whether to use GUI notifications
        """
        self._use_gui = use_gui
        self._method = self._detect_method()

    def _detect_method(self) -> NotificationMethod:
        """Detect available notification method."""
        if not self._use_gui:
            return NotificationMethod.TERMINAL

        # Check for notify-send (libnotify)
        try:
            result = subprocess.run(
                ["which", "notify-send"],
                capture_output=True,
                timeout=2,
            )
            if result.returncode == 0:
                return NotificationMethod.NOTIFY_SEND
        except Exception:
            pass

        # Fall back to terminal
        return NotificationMethod.TERMINAL

    async def notify_tool_execution(
        self,
        tool_name: str,
        role: Role,
        risk_level: RiskLevel,
    ):
        """
        Notify about tool execution.

        Args:
            tool_name: Name of the tool
            role: Role executing the tool
            risk_level: Risk level of the tool
        """
        title = "MCP Agent - Tool Execution"
        message = (
            f"Executing: {tool_name}\n"
            f"Role: {role.name}\n"
            f"Risk: {risk_level.value}"
        )

        await self.send_notification(title, message, risk_level)

    async def notify_connection_status(
        self,
        is_connected: bool,
        backend_url: str,
        error: Optional[str] = None,
    ):
        """
        Notify about connection status change.

        Args:
            is_connected: Whether connected
            backend_url: Backend URL
            error: Optional error message
        """
        if is_connected:
            title = "MCP Agent - Connected"
            message = f"Connected to backend:\n{backend_url}"
            urgency = "normal"
        else:
            title = "MCP Agent - Disconnected"
            message = f"Disconnected from backend:\n{backend_url}"
            if error:
                message += f"\nError: {error}"
            urgency = "critical"

        await self.send_notification(title, message, urgency=urgency)

    async def notify_error(self, title: str, message: str):
        """
        Send error notification.

        Args:
            title: Notification title
            message: Notification message
        """
        await self.send_notification(title, message, urgency="critical")

    async def send_notification(
        self,
        title: str,
        message: str,
        risk_level: Optional[RiskLevel] = None,
        urgency: str = "normal",
    ):
        """
        Send a notification using the available method.

        Args:
            title: Notification title
            message: Notification message
            risk_level: Optional risk level
            urgency: Urgency level (low, normal, critical)
        """
        # Map risk level to urgency
        if risk_level:
            urgency_map = {
                RiskLevel.SAFE: "low",
                RiskLevel.CAUTION: "normal",
                RiskLevel.ELEVATED: "critical",
            }
            urgency = urgency_map.get(risk_level, "normal")

        if self._method == NotificationMethod.NOTIFY_SEND:
            await self._send_notify_send(title, message, urgency)
        elif self._method == NotificationMethod.TERMINAL:
            self._send_terminal(title, message, urgency)

    async def _send_notify_send(self, title: str, message: str, urgency: str):
        """Send notification using notify-send."""
        try:
            subprocess.run(
                [
                    "notify-send",
                    "--urgency", urgency,
                    "--app-name", "Ubuntu MCP Agent",
                    title,
                    message,
                ],
                timeout=5,
                check=False,
            )
            logger.debug(f"Sent desktop notification: {title}")

        except Exception as e:
            logger.warning(f"Failed to send desktop notification: {e}")
            # Fall back to terminal
            self._send_terminal(title, message, urgency)

    def _send_terminal(self, title: str, message: str, urgency: str):
        """Send notification to terminal."""
        # ANSI color codes
        colors = {
            "low": "\033[32m",      # Green
            "normal": "\033[33m",   # Yellow
            "critical": "\033[31m", # Red
            "reset": "\033[0m",
        }

        color = colors.get(urgency, colors["normal"])
        reset = colors["reset"]

        output = f"\n{color}{'=' * 60}\n"
        output += f"{title}\n"
        output += f"{'-' * 60}\n"
        output += f"{message}\n"
        output += f"{'=' * 60}{reset}\n"

        print(output)
        logger.info(f"Terminal notification: {title}")

    def get_method(self) -> NotificationMethod:
        """Get current notification method."""
        return self._method
