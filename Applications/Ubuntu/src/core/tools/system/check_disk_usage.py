"""
Check disk usage using psutil.
"""
from typing import Dict, Any
import psutil
import os

from ..base import BaseTool
from ...models import ToolResult


def _is_wsl() -> bool:
    """Check if running in WSL (Windows Subsystem for Linux)."""
    try:
        # Check for WSL-specific files/environment
        if os.path.exists("/proc/version"):
            with open("/proc/version", "r") as f:
                version_info = f.read().lower()
                if "microsoft" in version_info or "wsl" in version_info:
                    return True
        # Check environment variable (WSL2)
        if "WSL_DISTRO_NAME" in os.environ or "WSL_INTEROP" in os.environ:
            return True
        return False
    except Exception:
        return False


class CheckDiskUsageTool(BaseTool):
    """Check disk usage for all mounted partitions."""

    def __init__(self):
        super().__init__()
        self._name = "check_disk_usage"
        self._description = "Check disk usage for all mounted partitions"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Specific path to check (default: all partitions)",
                }
            },
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute disk usage check.

        Args:
            arguments: Tool arguments (optional path)

        Returns:
            ToolResult with disk usage information
        """
        try:
            specific_path = arguments.get("path")

            output_lines = []

            if specific_path:
                # Check specific path
                is_wsl_env = _is_wsl()
                usage = psutil.disk_usage(specific_path)
                total_gb = usage.total / (1024 ** 3)
                used_gb = usage.used / (1024 ** 3)
                free_gb = usage.free / (1024 ** 3)

                output_lines.extend([
                    f"Disk Usage for: {specific_path}",
                    f"  Total: {total_gb:.2f} GB",
                    f"  Used:  {used_gb:.2f} GB ({usage.percent:.1f}%)",
                    f"  Free:  {free_gb:.2f} GB",
                ])
                
                if is_wsl_env:
                    output_lines.append("")
                    output_lines.append("NOTE: Running in WSL - this shows WSL virtual disk usage, not Windows host disk usage.")

                metadata = {
                    "path": specific_path,
                    "percent": usage.percent,
                    "total_gb": total_gb,
                    "used_gb": used_gb,
                    "free_gb": free_gb,
                }
                if is_wsl_env:
                    metadata["is_wsl"] = True
                    metadata["note"] = "WSL virtual disk - not Windows host disk"

                return self._success(
                    "\n".join(output_lines),
                    **metadata
                )
            else:
                # Check all partitions
                is_wsl_env = _is_wsl()
                partitions = psutil.disk_partitions()
                output_lines.append("Disk Usage for All Partitions:")
                if is_wsl_env:
                    output_lines.append("")
                    output_lines.append("NOTE: Running in WSL (Windows Subsystem for Linux)")
                    output_lines.append("This shows the WSL virtual disk usage, not your Windows host disk usage.")
                    output_lines.append("The WSL virtual disk may show a different capacity than your physical Windows disk.")
                output_lines.append("")

                partition_info = []
                for partition in partitions:
                    try:
                        usage = psutil.disk_usage(partition.mountpoint)
                        total_gb = usage.total / (1024 ** 3)
                        used_gb = usage.used / (1024 ** 3)
                        free_gb = usage.free / (1024 ** 3)

                        output_lines.extend([
                            f"Mount: {partition.mountpoint}",
                            f"  Device:     {partition.device}",
                            f"  Filesystem: {partition.fstype}",
                            f"  Total:      {total_gb:.2f} GB",
                            f"  Used:       {used_gb:.2f} GB ({usage.percent:.1f}%)",
                            f"  Free:       {free_gb:.2f} GB",
                            "",
                        ])

                        partition_info.append({
                            "mountpoint": partition.mountpoint,
                            "device": partition.device,
                            "fstype": partition.fstype,
                            "percent": usage.percent,
                            "total_gb": total_gb,
                            "used_gb": used_gb,
                            "free_gb": free_gb,
                        })

                    except PermissionError:
                        output_lines.append(
                            f"Mount: {partition.mountpoint} - Permission denied"
                        )
                        output_lines.append("")

                metadata = {"partitions": partition_info}
                if _is_wsl():
                    metadata["is_wsl"] = True
                    metadata["note"] = "WSL virtual disk - not Windows host disk"
                
                return self._success(
                    "\n".join(output_lines),
                    **metadata
                )

        except Exception as e:
            return self._failure(f"Failed to check disk usage: {str(e)}")
