"""
Restart an application using pkill and start.
"""
from typing import Dict, Any

from ..base import BaseTool
from ...models import ToolResult


class RestartApplicationTool(BaseTool):
    """Restart a running application by process name."""

    def __init__(self):
        super().__init__()
        self._name = "restart_application"
        self._description = "Restart a running application by killing and restarting it"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "process_name": {
                    "type": "string",
                    "description": "Name of the process to restart",
                },
                "command": {
                    "type": "string",
                    "description": "Command to start the application (optional, required if not a system service)",
                },
                "wait_seconds": {
                    "type": "integer",
                    "description": "Seconds to wait between kill and restart",
                    "default": 2,
                    "minimum": 0,
                    "maximum": 30,
                },
            },
            "required": ["process_name"],
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute application restart.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult with restart information
        """
        try:
            process_name = arguments.get("process_name")
            command = arguments.get("command")
            wait_seconds = arguments.get("wait_seconds", 2)

            if not process_name:
                return self._failure("Process name is required")

            # Sanitize process name - prevent command injection
            process_name = process_name.strip()
            if not process_name:
                return self._failure("Process name cannot be empty")
            # Prevent directory traversal and command injection
            if any(char in process_name for char in ['/', '\\', '..', ';', '&', '|', '`', '$', '(', ')', '<', '>', '\n', '\r']):
                return self._failure("Invalid process name: contains forbidden characters")

            output_lines = [f"Restarting application: {process_name}"]

            # Check if process is running
            stdout, _, returncode = await self._run_command(
                ["pgrep", "-x", process_name],
                timeout=5,
            )

            if returncode != 0:
                output_lines.append(f"Process '{process_name}' is not currently running")

                if command:
                    output_lines.append("Starting application...")
                    # Start the application
                    stdout, stderr, returncode = await self._run_command(
                        ["sh", "-c", command + " &"],
                        timeout=10,
                    )

                    if returncode != 0:
                        return self._failure(
                            f"Failed to start application: {stderr}",
                            returncode=returncode,
                        )

                    await __import__("asyncio").sleep(wait_seconds)

                    # Check if started
                    stdout, _, returncode = await self._run_command(
                        ["pgrep", "-x", process_name],
                        timeout=5,
                    )

                    if returncode == 0:
                        pids = stdout.strip().split('\n')
                        output_lines.append(
                            f"Application started successfully (PID: {', '.join(pids)})"
                        )
                        return self._success(
                            "\n".join(output_lines),
                            process_name=process_name,
                            action="started",
                            pids=pids,
                        )
                    else:
                        return self._failure(
                            f"Application did not start successfully",
                        )
                else:
                    return self._failure(
                        f"Process '{process_name}' is not running and no start command provided"
                    )

            # Process is running, get PIDs
            pids_before = stdout.strip().split('\n')
            output_lines.append(f"Found {len(pids_before)} process(es): {', '.join(pids_before)}")

            # Try to find if this is a systemd service first (if no command provided)
            service_name = None
            if not command:
                # Try to find if process name matches a systemd service
                # Check with and without .service suffix
                for candidate in [process_name, f"{process_name}.service"]:
                    stdout_check, _, returncode_check = await self._run_command(
                        ["systemctl", "is-active", candidate],
                        timeout=5,
                    )
                    if returncode_check == 0 or stdout_check.strip() in ["active", "inactive", "activating"]:
                        # Service exists, use it
                        service_name = candidate
                        break

            # If found as systemd service, use systemctl restart
            if service_name:
                output_lines.append(f"Detected systemd service: {service_name}")
                output_lines.append("Restarting service using systemctl...")
                stdout, stderr, returncode = await self._run_command(
                    ["systemctl", "restart", service_name],
                    timeout=30,
                    require_sudo=True,
                )

                if returncode == 0:
                    await __import__("asyncio").sleep(wait_seconds)
                    # Verify restart
                    stdout, _, returncode = await self._run_command(
                        ["pgrep", "-x", process_name],
                        timeout=5,
                    )
                    if returncode == 0:
                        pids_after = stdout.strip().split('\n')
                        output_lines.append(
                            f"Service restarted successfully (PID: {', '.join(pids_after)})"
                        )
                        return self._success(
                            "\n".join(output_lines),
                            process_name=process_name,
                            service_name=service_name,
                            action="restarted",
                            pids_before=pids_before,
                            pids_after=pids_after,
                        )
                    else:
                        # Service restarted but process not found (might be a different process name)
                        output_lines.append("Service restarted (process verification skipped)")
                        return self._success(
                            "\n".join(output_lines),
                            process_name=process_name,
                            service_name=service_name,
                            action="restarted",
                            pids_before=pids_before,
                        )
                else:
                    output_lines.append(f"Service restart failed, falling back to process restart")
                    # Fall through to regular process restart

            # Regular process restart (kill and restart)
            # Kill the process
            output_lines.append("Stopping process...")
            stdout, stderr, returncode = await self._run_command(
                ["pkill", "-x", process_name],
                timeout=10,
            )

            # Wait for process to terminate
            await __import__("asyncio").sleep(wait_seconds)

            # Verify process is stopped
            stdout, _, returncode = await self._run_command(
                ["pgrep", "-x", process_name],
                timeout=5,
            )

            if returncode == 0:
                # Force kill if still running
                output_lines.append("Process still running, forcing kill...")
                await self._run_command(
                    ["pkill", "-9", "-x", process_name],
                    timeout=5,
                )
                await __import__("asyncio").sleep(1)

            output_lines.append("Process stopped")

            # Restart if command provided
            if command:
                output_lines.append("Starting application...")
                stdout, stderr, returncode = await self._run_command(
                    ["sh", "-c", command + " &"],
                    timeout=10,
                )

                if returncode != 0:
                    return self._failure(
                        f"Process stopped but failed to restart: {stderr}",
                        returncode=returncode,
                    )

                await __import__("asyncio").sleep(wait_seconds)

                # Verify restart
                stdout, _, returncode = await self._run_command(
                    ["pgrep", "-x", process_name],
                    timeout=5,
                )

                if returncode == 0:
                    pids_after = stdout.strip().split('\n')
                    output_lines.append(
                        f"Application restarted successfully (PID: {', '.join(pids_after)})"
                    )
                    return self._success(
                        "\n".join(output_lines),
                        process_name=process_name,
                        action="restarted",
                        pids_before=pids_before,
                        pids_after=pids_after,
                    )
                else:
                    return self._failure(
                        f"Process stopped but did not restart successfully"
                    )
            else:
                # If no command and not a systemd service, just report stopped
                output_lines.append(
                    "Process stopped. No start command provided and not a systemd service."
                )
                return self._success(
                    "\n".join(output_lines),
                    process_name=process_name,
                    action="stopped",
                    pids_before=pids_before,
                )

        except Exception as e:
            return self._failure(f"Failed to restart application: {str(e)}")
