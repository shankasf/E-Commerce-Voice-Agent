"""
Check system uptime using /proc/uptime.
"""
from typing import Dict, Any
import psutil
from datetime import datetime, timedelta

from ..base import BaseTool
from ...models import ToolResult


class CheckSystemUptimeTool(BaseTool):
    """Check system uptime and boot time."""

    def __init__(self):
        super().__init__()
        self._name = "check_system_uptime"
        self._description = "Check system uptime and boot time"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {"type": "object", "properties": {}}

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute system uptime check.

        Args:
            arguments: Tool arguments (none)

        Returns:
            ToolResult with uptime information
        """
        try:
            # Get boot time
            boot_time = datetime.fromtimestamp(psutil.boot_time())
            current_time = datetime.now()
            uptime = current_time - boot_time

            # Format uptime
            days = uptime.days
            hours, remainder = divmod(uptime.seconds, 3600)
            minutes, seconds = divmod(remainder, 60)

            uptime_str = []
            if days > 0:
                uptime_str.append(f"{days} day{'s' if days != 1 else ''}")
            if hours > 0:
                uptime_str.append(f"{hours} hour{'s' if hours != 1 else ''}")
            if minutes > 0:
                uptime_str.append(f"{minutes} minute{'s' if minutes != 1 else ''}")

            uptime_formatted = ", ".join(uptime_str) if uptime_str else "less than a minute"

            # Get load average (Linux only)
            try:
                load1, load5, load15 = psutil.getloadavg()
                load_info = f"\nLoad Average: {load1:.2f}, {load5:.2f}, {load15:.2f}"
            except (AttributeError, OSError):
                load_info = ""
                load1 = load5 = load15 = None

            # Get number of users (if available)
            try:
                users = psutil.users()
                user_count = len(set(u.name for u in users))
                user_info = f"\nLogged in users: {user_count}"
            except Exception:
                user_info = ""
                user_count = None

            output = (
                f"System Uptime: {uptime_formatted}\n"
                f"Boot Time: {boot_time.strftime('%Y-%m-%d %H:%M:%S')}\n"
                f"Current Time: {current_time.strftime('%Y-%m-%d %H:%M:%S')}"
                f"{load_info}"
                f"{user_info}"
            )

            return self._success(
                output,
                uptime_seconds=int(uptime.total_seconds()),
                boot_time=boot_time.isoformat(),
                load_average=[load1, load5, load15] if load1 is not None else None,
                user_count=user_count,
            )

        except Exception as e:
            return self._failure(f"Failed to check system uptime: {str(e)}")
