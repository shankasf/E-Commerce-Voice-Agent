"""
Check CPU usage using psutil.
"""
from typing import Dict, Any
import psutil

from ..base import BaseTool
from ...models import ToolResult


class CheckCPUUsageTool(BaseTool):
    """Check current CPU usage and top processes."""

    def __init__(self):
        super().__init__()
        self._name = "check_cpu_usage"
        self._description = (
            "Check CPU usage percentage and identify top CPU-consuming processes"
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "top_processes": {
                    "type": "integer",
                    "description": "Number of top processes to show",
                    "default": 5,
                    "minimum": 1,
                    "maximum": 20,
                }
            },
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute CPU usage check.

        Args:
            arguments: Tool arguments (top_processes)

        Returns:
            ToolResult with CPU usage information
        """
        try:
            top_count = arguments.get("top_processes", 5)

            # Get overall CPU usage
            cpu_percent = psutil.cpu_percent(interval=1, percpu=False)
            cpu_count = psutil.cpu_count(logical=True)
            cpu_count_physical = psutil.cpu_count(logical=False)

            # Get per-CPU usage
            cpu_per_cpu = psutil.cpu_percent(interval=0.1, percpu=True)

            # Get top processes by CPU
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent']):
                try:
                    processes.append(proc.info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            # Sort by CPU usage
            processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)
            top_processes = processes[:top_count]

            # Build output
            output_lines = [
                f"CPU Usage: {cpu_percent:.1f}%",
                f"CPU Cores: {cpu_count_physical} physical, {cpu_count} logical",
                "",
                "Per-CPU Usage:",
            ]

            for i, usage in enumerate(cpu_per_cpu):
                output_lines.append(f"  CPU{i}: {usage:.1f}%")

            output_lines.extend([
                "",
                f"Top {top_count} CPU-Consuming Processes:",
            ])

            for proc in top_processes:
                cpu = proc.get('cpu_percent', 0)
                output_lines.append(
                    f"  PID {proc['pid']:6d}: {proc['name']:20s} - {cpu:.1f}%"
                )

            return self._success(
                "\n".join(output_lines),
                cpu_percent=cpu_percent,
                cpu_count=cpu_count,
                top_processes=top_processes,
            )

        except Exception as e:
            return self._failure(f"Failed to check CPU usage: {str(e)}")
