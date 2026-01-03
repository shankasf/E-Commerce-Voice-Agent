"""
Check IP address using psutil.
"""
from typing import Dict, Any
import psutil
import socket

from ..base import BaseTool
from ...models import ToolResult


class CheckIPAddressTool(BaseTool):
    """Check IP addresses for network interfaces."""

    def __init__(self):
        super().__init__()
        self._name = "check_ip_address"
        self._description = "Check IP addresses for all network interfaces"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "interface": {
                    "type": "string",
                    "description": "Specific interface to check (default: all)",
                },
                "include_ipv6": {
                    "type": "boolean",
                    "description": "Include IPv6 addresses",
                    "default": True,
                },
            },
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute IP address check.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult with IP address information
        """
        try:
            specific_interface = arguments.get("interface")
            include_ipv6 = arguments.get("include_ipv6", True)

            # Get network addresses
            net_if_addrs = psutil.net_if_addrs()

            output_lines = []
            ip_info = []

            # Get hostname
            hostname = socket.gethostname()
            output_lines.append(f"Hostname: {hostname}")
            output_lines.append("")

            # Filter interfaces
            if specific_interface:
                if specific_interface not in net_if_addrs:
                    return self._failure(f"Interface '{specific_interface}' not found")
                interfaces = {specific_interface: net_if_addrs[specific_interface]}
            else:
                interfaces = net_if_addrs

            output_lines.append("IP Addresses:")
            output_lines.append("")

            for iface, addrs in interfaces.items():
                # Skip loopback unless specifically requested
                if not specific_interface and iface == 'lo':
                    continue

                output_lines.append(f"Interface: {iface}")

                interface_ips = {"interface": iface, "ipv4": [], "ipv6": []}

                for addr in addrs:
                    if addr.family == 2:  # AF_INET (IPv4)
                        output_lines.append(f"  IPv4: {addr.address}")
                        if addr.netmask:
                            output_lines.append(f"    Netmask: {addr.netmask}")
                        if addr.broadcast:
                            output_lines.append(f"    Broadcast: {addr.broadcast}")

                        interface_ips["ipv4"].append({
                            "address": addr.address,
                            "netmask": addr.netmask,
                            "broadcast": addr.broadcast,
                        })

                    elif addr.family == 10 and include_ipv6:  # AF_INET6 (IPv6)
                        output_lines.append(f"  IPv6: {addr.address}")
                        if addr.netmask:
                            output_lines.append(f"    Netmask: {addr.netmask}")

                        interface_ips["ipv6"].append({
                            "address": addr.address,
                            "netmask": addr.netmask,
                        })

                    elif addr.family == 17:  # AF_PACKET (MAC address)
                        output_lines.append(f"  MAC: {addr.address}")
                        interface_ips["mac"] = addr.address

                ip_info.append(interface_ips)
                output_lines.append("")

            # Try to get external IP via socket connection
            try:
                # Connect to a public DNS server to get routing interface
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.settimeout(2)
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                s.close()
                output_lines.append(f"Primary Local IP: {local_ip}")
            except Exception:
                pass

            return self._success(
                "\n".join(output_lines),
                hostname=hostname,
                interfaces=ip_info,
            )

        except Exception as e:
            return self._failure(f"Failed to check IP addresses: {str(e)}")
