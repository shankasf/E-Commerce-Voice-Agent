"""
Restart any service using systemctl (requires HUMAN_AGENT role).
"""
from typing import Dict, Any

from ..base import BaseTool
from ...models import ToolResult


class RestartAnyServiceTool(BaseTool):
    """Restart any systemd service (requires elevated permissions)."""

    def __init__(self):
        super().__init__()
        self._name = "restart_any_service"
        self._description = (
            "Restart any systemd service (requires HUMAN_AGENT or ADMIN role)"
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "service_name": {
                    "type": "string",
                    "description": "Name of the service to restart",
                }
            },
            "required": ["service_name"],
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute service restart.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult with restart information
        """
        try:
            service_name = arguments.get("service_name")
            if not service_name:
                return self._failure("Service name is required")

            # Sanitize service name - prevent command injection
            service_name = service_name.strip()
            if not service_name:
                return self._failure("Service name cannot be empty")
            # Prevent directory traversal and command injection
            if any(char in service_name for char in ['/', '\\', '..', ';', '&', '|', '`', '$', '(', ')', '<', '>', '\n', '\r', '@']):
                return self._failure("Invalid service name: contains forbidden characters")

            output_lines = [f"Restarting service: {service_name}"]

            # Check if service exists
            stdout, stderr, returncode = await self._run_command(
                ["systemctl", "cat", service_name],
                timeout=5,
            )

            if returncode != 0:
                # Try with .service suffix
                service_with_suffix = f"{service_name}.service"
                stdout, stderr, returncode = await self._run_command(
                    ["systemctl", "cat", service_with_suffix],
                    timeout=5,
                )
                if returncode == 0:
                    service_name = service_with_suffix
                else:
                    return self._failure(
                        f"Service '{service_name}' not found on this system"
                    )

            # Get current status before restart
            stdout_before, _, _ = await self._run_command(
                ["systemctl", "is-active", service_name],
                timeout=5,
            )
            status_before = stdout_before.strip()

            output_lines.append(f"Status before restart: {status_before}")

            # Restart the service
            stdout, stderr, returncode = await self._run_command(
                ["systemctl", "restart", service_name],
                timeout=60,
                require_sudo=True,
            )

            if returncode != 0:
                return self._failure(
                    f"Failed to restart service '{service_name}': {stderr}",
                    returncode=returncode,
                )

            # Wait for service to stabilize
            await __import__("asyncio").sleep(3)

            # Check status after restart
            stdout_after, _, _ = await self._run_command(
                ["systemctl", "is-active", service_name],
                timeout=5,
            )
            status_after = stdout_after.strip()

            output_lines.append(f"Status after restart: {status_after}")

            # Get detailed status
            stdout_status, _, _ = await self._run_command(
                ["systemctl", "status", service_name, "--no-pager", "-l", "-n", "20"],
                timeout=5,
            )

            if status_after == "active":
                output_lines.append("")
                output_lines.append(f"Service '{service_name}' restarted successfully")
                output_lines.append("")
                output_lines.append("Recent logs:")
                output_lines.append(stdout_status)
                success = True
            else:
                output_lines.append("")
                output_lines.append(
                    f"WARNING: Service '{service_name}' restarted but is not active"
                )
                output_lines.append("")
                output_lines.append("Status details:")
                output_lines.append(stdout_status)
                success = False

            if success:
                return self._success(
                    "\n".join(output_lines),
                    service_name=service_name,
                    status_before=status_before,
                    status_after=status_after,
                )
            else:
                return self._failure(
                    "\n".join(output_lines),
                    service_name=service_name,
                    status_after=status_after,
                )

        except Exception as e:
            return self._failure(f"Failed to restart service: {str(e)}")
