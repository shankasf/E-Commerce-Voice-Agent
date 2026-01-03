"""
Reset network adapter using ip link commands.
"""
from typing import Dict, Any

from ..base import BaseTool
from ...models import ToolResult


class NetworkAdapterResetTool(BaseTool):
    """Reset a specific network adapter by bringing it down and up."""

    def __init__(self):
        super().__init__()
        self._name = "network_adapter_reset"
        self._description = "Reset a network adapter by bringing it down and up"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "interface": {
                    "type": "string",
                    "description": "Network interface to reset (e.g., eth0, wlan0)",
                }
            },
            "required": ["interface"],
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute network adapter reset.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult with reset information
        """
        try:
            interface = arguments.get("interface")
            if not interface:
                return self._failure("Interface parameter is required")
            
            # Sanitize interface name - prevent command injection
            interface = interface.strip()
            if any(char in interface for char in [';', '&', '|', '`', '$', '(', ')', '<', '>', '\n', '\r', ' ', '\t']):
                return self._failure("Invalid interface name: contains forbidden characters")

            output_lines = [f"Resetting network adapter: {interface}"]

            # Check if interface exists
            stdout, stderr, returncode = await self._run_command(
                ["ip", "link", "show", interface],
                timeout=5,
            )

            if returncode != 0:
                return self._failure(
                    f"Interface '{interface}' not found",
                    returncode=returncode,
                )

            # Bring interface down
            output_lines.append("Bringing interface down...")
            stdout, stderr, returncode = await self._run_command(
                ["ip", "link", "set", interface, "down"],
                timeout=10,
                require_sudo=True,
            )

            if returncode != 0:
                return self._failure(
                    f"Failed to bring interface down: {stderr}",
                    returncode=returncode,
                )

            # Wait a moment
            await __import__("asyncio").sleep(2)

            # Bring interface up
            output_lines.append("Bringing interface up...")
            stdout, stderr, returncode = await self._run_command(
                ["ip", "link", "set", interface, "up"],
                timeout=10,
                require_sudo=True,
            )

            if returncode != 0:
                return self._failure(
                    f"Failed to bring interface up: {stderr}",
                    returncode=returncode,
                )

            # Wait for interface to initialize
            await __import__("asyncio").sleep(3)

            # Get interface status
            stdout, stderr, returncode = await self._run_command(
                ["ip", "addr", "show", interface],
                timeout=5,
            )

            if returncode == 0:
                output_lines.append("")
                output_lines.append("Interface status:")
                output_lines.append(stdout)

                # Check if interface is up
                if "state UP" in stdout or "UP," in stdout:
                    output_lines.append("")
                    output_lines.append(f"Interface {interface} reset successfully and is UP")
                    status = "UP"
                else:
                    output_lines.append("")
                    output_lines.append(
                        f"Interface {interface} reset but may not be fully operational"
                    )
                    status = "DOWN"
            else:
                status = "UNKNOWN"

            return self._success(
                "\n".join(output_lines),
                interface=interface,
                status=status,
            )

        except Exception as e:
            return self._failure(f"Failed to reset network adapter: {str(e)}")
