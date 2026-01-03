"""
Flush DNS cache using systemd-resolve.
"""
from typing import Dict, Any

from ..base import BaseTool
from ...models import ToolResult


class FlushDNSCacheTool(BaseTool):
    """Flush DNS cache using systemd-resolved."""

    def __init__(self):
        super().__init__()
        self._name = "flush_dns_cache"
        self._description = "Flush DNS cache using systemd-resolved"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {"type": "object", "properties": {}}

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute DNS cache flush.

        Args:
            arguments: Tool arguments (none)

        Returns:
            ToolResult with flush information
        """
        try:
            # Try systemd-resolve first (older systems)
            commands = [
                ["systemd-resolve", "--flush-caches"],
                ["resolvectl", "flush-caches"],  # Newer systems
            ]

            success = False
            last_error = ""

            for command in commands:
                stdout, stderr, returncode = await self._run_command(
                    command,
                    timeout=10,
                    require_sudo=True,
                )

                if returncode == 0:
                    success = True
                    break
                else:
                    last_error = stderr

            if not success:
                # Try nscd if systemd-resolved is not available
                stdout, stderr, returncode = await self._run_command(
                    ["systemctl", "restart", "nscd"],
                    timeout=10,
                    require_sudo=True,
                )

                if returncode == 0:
                    return self._success(
                        "DNS cache flushed successfully (using nscd)",
                        method="nscd",
                    )
                else:
                    return self._failure(
                        f"Failed to flush DNS cache. Tried systemd-resolved and nscd.\n"
                        f"Last error: {last_error or stderr}",
                        returncode=returncode,
                    )

            # Get DNS statistics if available
            stats_stdout, _, stats_returncode = await self._run_command(
                ["resolvectl", "statistics"],
                timeout=5,
            )

            output = "DNS cache flushed successfully"
            if stats_returncode == 0 and stats_stdout:
                output += f"\n\nDNS Statistics:\n{stats_stdout}"

            return self._success(
                output,
                method="systemd-resolved",
            )

        except Exception as e:
            return self._failure(f"Failed to flush DNS cache: {str(e)}")
