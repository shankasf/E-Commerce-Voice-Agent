"""
Check system logs using journalctl.
"""
from typing import Dict, Any

from ..base import BaseTool
from ...models import ToolResult


class CheckSystemLogsTool(BaseTool):
    """Check system logs using journalctl."""

    def __init__(self):
        super().__init__()
        self._name = "check_system_logs"
        self._description = "Check system logs for errors and warnings"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "priority": {
                    "type": "string",
                    "description": "Log priority filter (emerg, alert, crit, err, warning, notice, info, debug)",
                    "default": "err",
                },
                "lines": {
                    "type": "integer",
                    "description": "Number of lines to retrieve",
                    "default": 50,
                    "minimum": 1,
                    "maximum": 500,
                },
                "since": {
                    "type": "string",
                    "description": "Time filter (e.g., '1 hour ago', 'today', '2 days ago')",
                    "default": "1 hour ago",
                },
                "unit": {
                    "type": "string",
                    "description": "Filter by systemd unit (optional)",
                },
            },
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute system log check.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult with log information
        """
        try:
            priority = arguments.get("priority", "err")
            lines = arguments.get("lines", 50)
            since = arguments.get("since", "1 hour ago")
            unit = arguments.get("unit")

            # Build journalctl command
            command = [
                "journalctl",
                "-p", priority,
                "-n", str(lines),
                "--since", since,
                "--no-pager",
            ]

            if unit:
                command.extend(["-u", unit])

            # Execute command
            stdout, stderr, returncode = await self._run_command(
                command,
                timeout=30,
            )

            if returncode != 0:
                return self._failure(
                    f"Failed to retrieve system logs: {stderr}",
                    returncode=returncode,
                )

            # Parse output
            log_lines = stdout.strip().split('\n') if stdout.strip() else []
            log_count = len(log_lines)

            if log_count == 0:
                output = f"No {priority} level logs found in the last {since}."
            else:
                output = f"System Logs (Priority: {priority}, Since: {since}):\n"
                output += f"Found {log_count} log entries\n"
                output += "=" * 70 + "\n"
                output += stdout

            return self._success(
                output,
                log_count=log_count,
                priority=priority,
                since=since,
                unit=unit,
            )

        except Exception as e:
            return self._failure(f"Failed to check system logs: {str(e)}")
