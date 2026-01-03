"""
Reset network stack using NetworkManager restart.
"""
from typing import Dict, Any

from ..base import BaseTool
from ...models import ToolResult


class ResetNetworkStackTool(BaseTool):
    """Reset network stack by restarting NetworkManager."""

    def __init__(self):
        super().__init__()
        self._name = "reset_network_stack"
        self._description = "Reset network stack by restarting NetworkManager service"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {"type": "object", "properties": {}}

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute network stack reset.

        Args:
            arguments: Tool arguments (none)

        Returns:
            ToolResult with reset information
        """
        try:
            output_lines = ["Resetting network stack..."]

            # Check which network manager is running
            # Try NetworkManager first
            stdout, stderr, returncode = await self._run_command(
                ["systemctl", "is-active", "NetworkManager"],
                timeout=5,
            )

            if returncode == 0 and stdout.strip() == "active":
                # Restart NetworkManager
                stdout, stderr, returncode = await self._run_command(
                    ["systemctl", "restart", "NetworkManager"],
                    timeout=30,
                    require_sudo=True,
                )

                if returncode != 0:
                    return self._failure(
                        f"Failed to restart NetworkManager: {stderr}",
                        returncode=returncode,
                    )

                output_lines.append("NetworkManager service restarted successfully")
                method = "NetworkManager"

            else:
                # Try networking service (Debian/Ubuntu)
                stdout, stderr, returncode = await self._run_command(
                    ["systemctl", "restart", "networking"],
                    timeout=30,
                    require_sudo=True,
                )

                if returncode == 0:
                    output_lines.append("Networking service restarted successfully")
                    method = "networking"
                else:
                    # Try systemd-networkd
                    stdout, stderr, returncode = await self._run_command(
                        ["systemctl", "restart", "systemd-networkd"],
                        timeout=30,
                        require_sudo=True,
                    )

                    if returncode != 0:
                        return self._failure(
                            f"Failed to restart network services. "
                            f"No supported network manager found.",
                            returncode=returncode,
                        )

                    output_lines.append("systemd-networkd service restarted successfully")
                    method = "systemd-networkd"

            # Wait for network to stabilize
            await __import__("asyncio").sleep(3)

            # Get network status
            stdout, stderr, returncode = await self._run_command(
                ["ip", "link", "show"],
                timeout=5,
            )

            if returncode == 0:
                output_lines.append("")
                output_lines.append("Network interfaces:")
                for line in stdout.split('\n'):
                    if line and not line.startswith(' '):
                        output_lines.append(f"  {line.strip()}")

            return self._success(
                "\n".join(output_lines),
                method=method,
            )

        except Exception as e:
            return self._failure(f"Failed to reset network stack: {str(e)}")
