"""
Renew IP address using dhclient or nmcli.
"""
from typing import Dict, Any

from ..base import BaseTool
from ...models import ToolResult


class RenewIPAddressTool(BaseTool):
    """Renew IP address using DHCP."""

    def __init__(self):
        super().__init__()
        self._name = "renew_ip_address"
        self._description = "Renew IP address using DHCP (dhclient or NetworkManager)"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "interface": {
                    "type": "string",
                    "description": "Network interface to renew (default: auto-detect)",
                }
            },
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute IP address renewal.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult with renewal information
        """
        try:
            interface = arguments.get("interface")
            
            # Sanitize interface name if provided
            if interface:
                interface = interface.strip()
                if any(char in interface for char in [';', '&', '|', '`', '$', '(', ')', '<', '>', '\n', '\r', ' ', '\t']):
                    return self._failure("Invalid interface name: contains forbidden characters")

            # Try to detect default interface if not specified
            if not interface:
                # Get default route interface
                stdout, stderr, returncode = await self._run_command(
                    ["ip", "route", "show", "default"],
                    timeout=5,
                )

                if returncode == 0 and stdout:
                    # Parse: default via 192.168.1.1 dev eth0 ...
                    parts = stdout.split()
                    if "dev" in parts:
                        dev_idx = parts.index("dev")
                        if dev_idx + 1 < len(parts):
                            interface = parts[dev_idx + 1]

                if not interface:
                    return self._failure(
                        "Could not auto-detect network interface. "
                        "Please specify the interface parameter."
                    )

            output_lines = [f"Renewing IP address for interface: {interface}"]

            # Try NetworkManager first (more common on desktop systems)
            stdout, stderr, returncode = await self._run_command(
                ["nmcli", "connection", "show"],
                timeout=5,
            )

            if returncode == 0:
                # NetworkManager is available
                # Bring connection down and up
                _, _, down_code = await self._run_command(
                    ["nmcli", "device", "disconnect", interface],
                    timeout=10,
                    require_sudo=True,
                )

                await __import__("asyncio").sleep(2)

                _, _, up_code = await self._run_command(
                    ["nmcli", "device", "connect", interface],
                    timeout=10,
                    require_sudo=True,
                )

                if up_code == 0:
                    output_lines.append("Successfully renewed using NetworkManager")
                    method = "NetworkManager"
                else:
                    return self._failure(
                        f"Failed to reconnect interface using NetworkManager: {stderr}"
                    )
            else:
                # Try dhclient
                # Release current lease
                await self._run_command(
                    ["dhclient", "-r", interface],
                    timeout=10,
                    require_sudo=True,
                )

                await __import__("asyncio").sleep(2)

                # Request new lease
                stdout, stderr, returncode = await self._run_command(
                    ["dhclient", interface],
                    timeout=30,
                    require_sudo=True,
                )

                if returncode != 0:
                    return self._failure(
                        f"Failed to renew IP address using dhclient: {stderr}",
                        returncode=returncode,
                    )

                output_lines.append("Successfully renewed using dhclient")
                method = "dhclient"

            # Get new IP address
            await __import__("asyncio").sleep(1)
            stdout, stderr, returncode = await self._run_command(
                ["ip", "addr", "show", interface],
                timeout=5,
            )

            if returncode == 0:
                output_lines.append("")
                output_lines.append("New IP configuration:")
                # Parse IP addresses
                for line in stdout.split('\n'):
                    line = line.strip()
                    if line.startswith("inet ") or line.startswith("inet6 "):
                        output_lines.append(f"  {line}")

            return self._success(
                "\n".join(output_lines),
                interface=interface,
                method=method,
            )

        except Exception as e:
            return self._failure(f"Failed to renew IP address: {str(e)}")
