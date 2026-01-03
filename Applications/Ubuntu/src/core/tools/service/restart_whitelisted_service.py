"""
Restart whitelisted services using systemctl.
"""
from typing import Dict, Any

from ..base import BaseTool
from ...models import ToolResult


class RestartWhitelistedServiceTool(BaseTool):
    """Restart services from a predefined whitelist."""

    # Whitelist of safe services that can be restarted
    WHITELISTED_SERVICES = [
        "apache2",
        "nginx",
        "mysql",
        "mariadb",
        "postgresql",
        "redis",
        "mongodb",
        "docker",
        "ssh",
        "sshd",
        "cups",
        "bluetooth",
        "ufw",
        "fail2ban",
        "cron",
    ]

    def __init__(self):
        super().__init__()
        self._name = "restart_whitelisted_service"
        self._description = (
            f"Restart a service from whitelist: {', '.join(self.WHITELISTED_SERVICES)}"
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "service_name": {
                    "type": "string",
                    "description": f"Service to restart (must be in whitelist)",
                    "enum": self.WHITELISTED_SERVICES,
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

            # Validate against whitelist
            if service_name not in self.WHITELISTED_SERVICES:
                return self._failure(
                    f"Service '{service_name}' is not in the whitelist. "
                    f"Allowed services: {', '.join(self.WHITELISTED_SERVICES)}"
                )

            output_lines = [f"Restarting service: {service_name}"]

            # Check if service exists and is loaded
            stdout, stderr, returncode = await self._run_command(
                ["systemctl", "is-enabled", service_name],
                timeout=5,
            )

            if returncode not in [0, 1]:  # 0 = enabled, 1 = disabled but exists
                # Service might not exist, try with .service suffix
                service_with_suffix = f"{service_name}.service"
                stdout, stderr, returncode = await self._run_command(
                    ["systemctl", "is-enabled", service_with_suffix],
                    timeout=5,
                )
                if returncode not in [0, 1]:
                    return self._failure(
                        f"Service '{service_name}' not found on this system"
                    )
                service_name = service_with_suffix

            # Get current status before restart
            stdout_before, _, _ = await self._run_command(
                ["systemctl", "is-active", service_name],
                timeout=5,
            )
            status_before = stdout_before.strip()

            # Restart the service
            output_lines.append(f"Status before restart: {status_before}")
            stdout, stderr, returncode = await self._run_command(
                ["systemctl", "restart", service_name],
                timeout=30,
                require_sudo=True,
            )

            if returncode != 0:
                return self._failure(
                    f"Failed to restart service '{service_name}': {stderr}",
                    returncode=returncode,
                )

            # Wait a moment for service to stabilize
            await __import__("asyncio").sleep(2)

            # Check status after restart
            stdout_after, _, _ = await self._run_command(
                ["systemctl", "is-active", service_name],
                timeout=5,
            )
            status_after = stdout_after.strip()

            output_lines.append(f"Status after restart: {status_after}")

            # Get detailed status
            stdout_status, _, _ = await self._run_command(
                ["systemctl", "status", service_name, "--no-pager", "-l"],
                timeout=5,
            )

            if status_after == "active":
                output_lines.append("")
                output_lines.append(f"Service '{service_name}' restarted successfully")
                success = True
            else:
                output_lines.append("")
                output_lines.append(
                    f"Service '{service_name}' restarted but is not active"
                )
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
