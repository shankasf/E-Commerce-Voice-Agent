"""
Check memory usage using psutil.
"""
from typing import Dict, Any
import psutil

from ..base import BaseTool
from ...models import ToolResult


class CheckMemoryUsageTool(BaseTool):
    """Check current memory usage and top memory-consuming processes."""

    def __init__(self):
        super().__init__()
        self._name = "check_memory_usage"
        self._description = (
            "Check RAM and swap usage, and identify top memory-consuming processes"
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
        Execute memory usage check.

        Args:
            arguments: Tool arguments (top_processes)

        Returns:
            ToolResult with memory usage information
        """
        try:
            top_count = arguments.get("top_processes", 5)

            # Get memory information
            mem = psutil.virtual_memory()
            swap = psutil.swap_memory()

            # Convert to GB for readability
            mem_total_gb = mem.total / (1024 ** 3)
            mem_used_gb = mem.used / (1024 ** 3)
            mem_available_gb = mem.available / (1024 ** 3)

            swap_total_gb = swap.total / (1024 ** 3)
            swap_used_gb = swap.used / (1024 ** 3)

            # Get top processes by memory
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'memory_percent', 'memory_info']):
                try:
                    info = proc.info
                    if info['memory_info']:
                        info['memory_mb'] = info['memory_info'].rss / (1024 ** 2)
                    processes.append(info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            # Sort by memory usage
            processes.sort(key=lambda x: x.get('memory_percent', 0), reverse=True)
            top_processes = processes[:top_count]

            # Build output
            output_lines = [
                "Memory Usage:",
                f"  Total:     {mem_total_gb:.2f} GB",
                f"  Used:      {mem_used_gb:.2f} GB ({mem.percent:.1f}%)",
                f"  Available: {mem_available_gb:.2f} GB",
                "",
                "Swap Usage:",
                f"  Total:     {swap_total_gb:.2f} GB",
                f"  Used:      {swap_used_gb:.2f} GB ({swap.percent:.1f}%)",
                "",
                f"Top {top_count} Memory-Consuming Processes:",
            ]

            for proc in top_processes:
                mem_mb = proc.get('memory_mb', 0)
                mem_pct = proc.get('memory_percent', 0)
                output_lines.append(
                    f"  PID {proc['pid']:6d}: {proc['name']:20s} - "
                    f"{mem_mb:.1f} MB ({mem_pct:.1f}%)"
                )

            return self._success(
                "\n".join(output_lines),
                memory_percent=mem.percent,
                swap_percent=swap.percent,
                memory_total_gb=mem_total_gb,
                memory_used_gb=mem_used_gb,
                top_processes=top_processes,
            )

        except Exception as e:
            return self._failure(f"Failed to check memory usage: {str(e)}")
