"""
Check network status using psutil.
"""
from typing import Dict, Any
import psutil

from ..base import BaseTool
from ...models import ToolResult


class CheckNetworkStatusTool(BaseTool):
    """Check network interface status and statistics."""

    def __init__(self):
        super().__init__()
        self._name = "check_network_status"
        self._description = "Check network interface status and statistics"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "interface": {
                    "type": "string",
                    "description": "Specific interface to check (default: all)",
                }
            },
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute network status check.

        Args:
            arguments: Tool arguments (optional interface)

        Returns:
            ToolResult with network status information
        """
        try:
            specific_interface = arguments.get("interface")

            # Get network interface statistics
            net_if_stats = psutil.net_if_stats()
            net_if_addrs = psutil.net_if_addrs()
            net_io_counters = psutil.net_io_counters(pernic=True)

            output_lines = []
            interface_info = []

            # Filter interfaces
            if specific_interface:
                if specific_interface not in net_if_stats:
                    return self._failure(f"Interface '{specific_interface}' not found")
                interfaces = {specific_interface: net_if_stats[specific_interface]}
            else:
                interfaces = net_if_stats

            output_lines.append("Network Interface Status:")
            output_lines.append("")

            for iface, stats in interfaces.items():
                # Skip loopback unless specifically requested
                if not specific_interface and iface == 'lo':
                    continue

                output_lines.append(f"Interface: {iface}")
                output_lines.append(f"  Status: {'UP' if stats.isup else 'DOWN'}")
                output_lines.append(f"  Speed: {stats.speed} Mbps")
                output_lines.append(f"  MTU: {stats.mtu}")

                # Get addresses
                if iface in net_if_addrs:
                    for addr in net_if_addrs[iface]:
                        if addr.family == 2:  # AF_INET (IPv4)
                            output_lines.append(f"  IPv4: {addr.address}")
                            output_lines.append(f"  Netmask: {addr.netmask}")
                        elif addr.family == 10:  # AF_INET6 (IPv6)
                            output_lines.append(f"  IPv6: {addr.address}")

                # Get I/O counters
                if iface in net_io_counters:
                    io = net_io_counters[iface]
                    bytes_sent_mb = io.bytes_sent / (1024 ** 2)
                    bytes_recv_mb = io.bytes_recv / (1024 ** 2)

                    output_lines.append(f"  Bytes Sent: {bytes_sent_mb:.2f} MB")
                    output_lines.append(f"  Bytes Received: {bytes_recv_mb:.2f} MB")
                    output_lines.append(f"  Packets Sent: {io.packets_sent}")
                    output_lines.append(f"  Packets Received: {io.packets_recv}")
                    output_lines.append(f"  Errors In: {io.errin}")
                    output_lines.append(f"  Errors Out: {io.errout}")
                    output_lines.append(f"  Drops In: {io.dropin}")
                    output_lines.append(f"  Drops Out: {io.dropout}")

                output_lines.append("")

                # Collect metadata
                info = {
                    "name": iface,
                    "isup": stats.isup,
                    "speed": stats.speed,
                    "mtu": stats.mtu,
                }

                if iface in net_io_counters:
                    io = net_io_counters[iface]
                    info["bytes_sent"] = io.bytes_sent
                    info["bytes_recv"] = io.bytes_recv
                    info["packets_sent"] = io.packets_sent
                    info["packets_recv"] = io.packets_recv

                interface_info.append(info)

            return self._success(
                "\n".join(output_lines),
                interfaces=interface_info,
            )

        except Exception as e:
            return self._failure(f"Failed to check network status: {str(e)}")
