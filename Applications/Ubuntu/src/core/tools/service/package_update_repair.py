"""
Package update and repair using apt-get or dnf.
"""
from typing import Dict, Any

from ..base import BaseTool
from ...models import ToolResult


class PackageUpdateRepairTool(BaseTool):
    """Update and repair package manager (apt or dnf)."""

    def __init__(self):
        super().__init__()
        self._name = "package_update_repair"
        self._description = "Update package lists and repair broken packages"

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "description": "Operation to perform",
                    "enum": ["update", "repair", "both"],
                    "default": "both",
                },
                "auto_fix": {
                    "type": "boolean",
                    "description": "Automatically fix broken dependencies",
                    "default": True,
                },
            },
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute package update/repair.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult with operation information
        """
        try:
            operation = arguments.get("operation", "both")
            auto_fix = arguments.get("auto_fix", True)

            output_lines = []

            # Detect package manager
            pkg_manager = await self._detect_package_manager()
            if not pkg_manager:
                return self._failure(
                    "No supported package manager found (apt or dnf)"
                )

            output_lines.append(f"Using package manager: {pkg_manager}")
            output_lines.append("")

            # Update package lists
            if operation in ["update", "both"]:
                output_lines.append("Updating package lists...")

                if pkg_manager == "apt":
                    stdout, stderr, returncode = await self._run_command(
                        ["apt-get", "update"],
                        timeout=120,
                        require_sudo=True,
                    )
                else:  # dnf
                    stdout, stderr, returncode = await self._run_command(
                        ["dnf", "check-update"],
                        timeout=120,
                        require_sudo=True,
                    )

                if returncode not in [0, 100]:  # 100 is dnf's "updates available" code
                    output_lines.append(f"Warning: Update command returned code {returncode}")
                    output_lines.append(stderr[:500] if stderr else "")
                else:
                    output_lines.append("Package lists updated successfully")

                output_lines.append("")

            # Repair broken packages
            if operation in ["repair", "both"]:
                output_lines.append("Checking for broken packages...")

                if pkg_manager == "apt":
                    # Check for broken packages
                    stdout, stderr, returncode = await self._run_command(
                        ["dpkg", "--audit"],
                        timeout=30,
                    )

                    if stdout.strip():
                        output_lines.append("Found broken packages:")
                        output_lines.append(stdout[:500])

                        if auto_fix:
                            output_lines.append("")
                            output_lines.append("Attempting to fix broken packages...")

                            # Configure any unconfigured packages
                            await self._run_command(
                                ["dpkg", "--configure", "-a"],
                                timeout=60,
                                require_sudo=True,
                            )

                            # Fix broken dependencies
                            stdout, stderr, returncode = await self._run_command(
                                ["apt-get", "install", "-f", "-y"],
                                timeout=300,
                                require_sudo=True,
                            )

                            if returncode == 0:
                                output_lines.append("Broken packages fixed successfully")
                            else:
                                output_lines.append(f"Fix attempt completed with code {returncode}")
                                output_lines.append(stderr[:500] if stderr else "")

                            # Clean up
                            await self._run_command(
                                ["apt-get", "autoremove", "-y"],
                                timeout=60,
                                require_sudo=True,
                            )
                            await self._run_command(
                                ["apt-get", "autoclean"],
                                timeout=60,
                                require_sudo=True,
                            )
                    else:
                        output_lines.append("No broken packages found")

                else:  # dnf
                    # Check for problems
                    stdout, stderr, returncode = await self._run_command(
                        ["dnf", "check"],
                        timeout=30,
                    )

                    if returncode != 0:
                        output_lines.append("Found package issues:")
                        output_lines.append(stdout[:500])

                        if auto_fix:
                            output_lines.append("")
                            output_lines.append("Attempting to fix package issues...")

                            stdout, stderr, returncode = await self._run_command(
                                ["dnf", "distro-sync", "-y"],
                                timeout=300,
                                require_sudo=True,
                            )

                            if returncode == 0:
                                output_lines.append("Package issues fixed successfully")
                            else:
                                output_lines.append(f"Fix attempt completed with code {returncode}")
                                output_lines.append(stderr[:500] if stderr else "")

                            # Clean up
                            await self._run_command(
                                ["dnf", "autoremove", "-y"],
                                timeout=60,
                                require_sudo=True,
                            )
                            await self._run_command(
                                ["dnf", "clean", "all"],
                                timeout=60,
                                require_sudo=True,
                            )
                    else:
                        output_lines.append("No package issues found")

            return self._success(
                "\n".join(output_lines),
                package_manager=pkg_manager,
                operation=operation,
            )

        except Exception as e:
            return self._failure(f"Failed to update/repair packages: {str(e)}")

    async def _detect_package_manager(self) -> str:
        """Detect which package manager is available."""
        # Check for apt
        stdout, stderr, returncode = await self._run_command(
            ["which", "apt-get"],
            timeout=5,
        )
        if returncode == 0:
            return "apt"

        # Check for dnf
        stdout, stderr, returncode = await self._run_command(
            ["which", "dnf"],
            timeout=5,
        )
        if returncode == 0:
            return "dnf"

        return ""
