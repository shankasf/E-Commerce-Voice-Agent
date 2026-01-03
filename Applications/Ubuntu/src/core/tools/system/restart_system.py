"""
Restart system using systemctl reboot.
"""
from typing import Dict, Any

from ..base import BaseTool
from ...models import ToolResult


class RestartSystemTool(BaseTool):
    """Restart the system using systemctl reboot."""

    def __init__(self):
        super().__init__()
        self._name = "restart_system"
        self._description = "Restart the system (requires admin privileges)"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "delay_seconds": {
                    "type": "integer",
                    "description": "Delay before restart in seconds",
                    "default": 60,
                    "minimum": 0,
                    "maximum": 3600,
                },
                "message": {
                    "type": "string",
                    "description": "Message to display to users",
                    "default": "System restart initiated by MCP Agent",
                },
            },
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute system restart.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult with restart information
        """
        try:
            delay_seconds = arguments.get("delay_seconds", 60)
            message = arguments.get("message", "System restart initiated by MCP Agent")

            # Broadcast message to all logged-in users
            if message:
                try:
                    await self._run_command(
                        ["wall", message],
                        timeout=5,
                        require_sudo=True,
                    )
                except Exception:
                    pass  # Non-critical if wall fails

            # Schedule system restart
            if delay_seconds > 0:
                # Use shutdown command with delay
                command = [
                    "shutdown",
                    "-r",
                    f"+{delay_seconds // 60}",  # shutdown uses minutes
                    message,
                ]
            else:
                # Immediate restart
                command = ["systemctl", "reboot"]

            stdout, stderr, returncode = await self._run_command(
                command,
                timeout=10,
                require_sudo=True,
            )

            if returncode != 0:
                return self._failure(
                    f"Failed to schedule system restart: {stderr}",
                    returncode=returncode,
                )

            output = f"System restart scheduled in {delay_seconds} seconds"
            if delay_seconds > 0:
                output += f"\nMessage: {message}"
                output += f"\n\nTo cancel: sudo shutdown -c"

            return self._success(
                output,
                delay_seconds=delay_seconds,
                message=message,
            )

        except Exception as e:
            return self._failure(f"Failed to restart system: {str(e)}")
