"""
Execute a terminal/shell command and return the output.
Restricted to HUMAN_AGENT and ADMIN roles only for security.
"""
from typing import Dict, Any
import re

from ..base import BaseTool
from ...models import ToolResult


class ExecuteTerminalCommandTool(BaseTool):
    """Execute a terminal/shell command (HUMAN_AGENT/ADMIN only)."""

    # Dangerous commands that should be blocked
    DANGEROUS_COMMANDS = [
        "rm -rf /",
        "rm -rf /*",
        "dd if=",
        "mkfs",
        "fdisk",
        "format",
        "shutdown",
        "reboot",
        "init 0",
        "init 6",
        "> /dev/sda",
        "mkfs.ext",
    ]

    def __init__(self):
        super().__init__()
        self._name = "execute_terminal_command"
        self._description = (
            "Execute a Linux/Unix terminal/shell command and return output. "
            "Use Linux commands (e.g., 'ps aux', 'ls -la', 'top'). "
            "Do NOT use Windows commands or shells. "
            "Restricted to HUMAN_AGENT and ADMIN roles. "
            "For commands requiring root privileges, start command with 'sudo ' or set use_sudo=true. "
            "Dangerous commands are blocked for security. "
            "Passwordless sudo must be configured for sudo commands to work."
        )

    @property
    def parameters(self) -> Dict[str, Any]:
        """Tool parameters schema."""
        return {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "Linux/Unix command to execute (e.g., 'ps aux', 'ls -la', 'cat /etc/os-release'). Use Linux commands, not Windows commands. For commands requiring root privileges, start with 'sudo ' or set use_sudo=true. If command starts with 'sudo ', it will be executed with sudo automatically.",
                },
                "shell": {
                    "type": "string",
                    "description": "Shell to use (default: /bin/bash). Only Linux shells are allowed: /bin/bash, /bin/sh, /bin/zsh. Do NOT use Windows shells like 'cmd' or 'powershell'.",
                    "default": "/bin/bash",
                },
                "use_sudo": {
                    "type": "boolean",
                    "description": "Execute command with sudo/root privileges (default: auto-detect from command if it starts with 'sudo '). Set to true to explicitly require sudo.",
                    "default": False,
                },
                "timeout_seconds": {
                    "type": "integer",
                    "description": "Timeout in seconds (default: 60, max: 300)",
                    "default": 60,
                    "minimum": 1,
                    "maximum": 300,
                },
            },
            "required": ["command"],
        }

    async def execute(self, arguments: Dict[str, Any]) -> ToolResult:
        """
        Execute terminal command.

        Args:
            arguments: Tool arguments

        Returns:
            ToolResult with command output
        """
        try:
            command = arguments.get("command")
            if not command:
                return self._failure("Command parameter is required")

            # Auto-detect shell if not provided or if invalid shell provided
            requested_shell = arguments.get("shell") or "/bin/bash"
            shell = self._get_valid_shell(requested_shell)
            
            # Log if shell was corrected
            if requested_shell != shell and requested_shell:
                # Shell was auto-corrected (e.g., 'cmd' → '/bin/bash')
                # This is fine, we'll use the valid shell
                pass
            
            timeout_seconds = arguments.get("timeout_seconds", 60)
            use_sudo = arguments.get("use_sudo", False)

            # Auto-detect if command starts with "sudo " - remove it and set use_sudo=True (case-insensitive)
            command_stripped = command.strip()
            if command_stripped.lower().startswith("sudo "):
                # Remove "sudo " prefix (case-insensitive) and any extra whitespace
                command = command_stripped[5:].strip()
                use_sudo = True

            # Validate command (after stripping sudo)
            validation_result = self._validate_command(command, shell)
            if not validation_result["valid"]:
                return self._failure(validation_result["error"])

            # Execute command with sudo if needed
            stdout, stderr, returncode = await self._run_command(
                [shell, "-c", command],
                timeout=timeout_seconds,
                require_sudo=use_sudo,
            )

            # Combine stdout and stderr for output
            output_lines = []
            if stdout:
                output_lines.append(stdout)
            if stderr and returncode != 0:
                output_lines.append(f"\nError output:\n{stderr}")

            output = "\n".join(output_lines) if output_lines else "Command executed (no output)"

            if returncode == 0:
                return self._success(
                    output,
                    command=command,
                    shell=shell,
                    exit_code=returncode,
                    used_sudo=use_sudo,
                )
            else:
                error_msg = stderr if stderr else f"Command exited with code {returncode}"
                
                # Check if it's a sudo-related error
                if use_sudo:
                    error_lower = error_msg.lower()
                    if "password" in error_lower or "nopasswd" in error_lower or "sudo:" in error_lower:
                        error_msg += " Note: Passwordless sudo must be configured. Run 'sudo visudo' and add: 'username ALL=(ALL) NOPASSWD: ALL'"
                
                return self._failure(
                    f"Command failed: {error_msg}",
                    command=command,
                    exit_code=returncode,
                    used_sudo=use_sudo,
                )

        except Exception as e:
            return self._failure(f"Failed to execute command: {str(e)}")

    def _validate_command(self, command: str, shell: str) -> Dict[str, Any]:
        """
        Validate command for safety.

        Args:
            command: Command to validate
            shell: Shell to use

        Returns:
            Dict with 'valid' (bool) and 'error' (str) keys
        """
        if not command or not command.strip():
            return {"valid": False, "error": "Command cannot be empty"}

        command_lower = command.lower()

        # Check for dangerous commands
        for dangerous in self.DANGEROUS_COMMANDS:
            if dangerous.lower() in command_lower:
                return {
                    "valid": False,
                    "error": f"Command contains dangerous operation: {dangerous}. This command is blocked for security reasons.",
                }

        # Check for command injection attempts
        dangerous_patterns = [
            r"&&\s*[^&]",  # Command chaining with &&
            r"\|\|\s*[^|]",  # Command chaining with ||
            r";\s*[^;]",  # Command separator
            r"`[^`]*`",  # Command substitution with backticks
            r"\$\([^)]*\)",  # Command substitution with $()
            r"\$\{[^}]*\}",  # Variable substitution with ${}
            r">\s*/dev/(sd|hd|nvme)",  # Writing to block devices
            r">\s*>\s*/dev/(sd|hd|nvme)",  # Appending to block devices
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, command):
                return {
                    "valid": False,
                    "error": "Command contains potentially dangerous operators or patterns. Use simple commands only.",
                }

        # Shell validation is done in _get_valid_shell, just check it's valid
        allowed_shells = ["/bin/bash", "/bin/sh", "/bin/zsh"]
        if shell not in allowed_shells:
            return {
                "valid": False,
                "error": f"Shell '{shell}' is not allowed. Allowed shells: {', '.join(allowed_shells)}",
            }

        # Check command length
        if len(command) > 2000:
            return {"valid": False, "error": "Command is too long. Maximum length is 2000 characters."}

        return {"valid": True, "error": None}

    def _get_valid_shell(self, requested_shell: str) -> str:
        """
        Get a valid Linux shell, auto-detecting if needed.
        
        Args:
            requested_shell: Shell requested by user
            
        Returns:
            Valid shell path
        """
        allowed_shells = ["/bin/bash", "/bin/sh", "/bin/zsh"]
        
        # If requested shell is valid, use it
        if requested_shell in allowed_shells:
            return requested_shell
        
        # If Windows shell was requested, use default Linux shell
        if requested_shell.lower() in ["cmd", "powershell", "pwsh", "cmd.exe", "powershell.exe"]:
            # Auto-detect best available Linux shell
            import os
            for shell in allowed_shells:
                if os.path.exists(shell) and os.access(shell, os.X_OK):
                    return shell
            # Fallback to /bin/sh (most common)
            return "/bin/sh"
        
        # Try to find the requested shell in the system
        import os
        if os.path.exists(requested_shell) and os.access(requested_shell, os.X_OK):
            # If it exists and is executable, use it (but this shouldn't happen with our validation)
            return requested_shell
        
        # Default to /bin/bash
        return "/bin/bash"

