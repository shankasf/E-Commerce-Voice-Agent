"""
Terminal Server - MCP-based command execution service.

Provides secure terminal access for diagnostic commands on Windows and Linux.
Uses a blocklist-only approach to security - LLM decides what to run.

Uses the official Anthropic MCP SDK.
"""

import asyncio
import logging
import os
import subprocess
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────

# Load .env file if exists
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ.setdefault(key.strip(), value.strip())


@dataclass
class Config:
    """Terminal server configuration."""
    
    # Linux connection method
    linux_method: str = field(default_factory=lambda: os.getenv("LINUX_METHOD", "ssh"))
    wsl_distro: str = field(default_factory=lambda: os.getenv("WSL_DISTRO", "Ubuntu"))
    
    # SSH Configuration
    ssh_host: str = field(default_factory=lambda: os.getenv("SSH_HOST", "localhost"))
    ssh_port: int = field(default_factory=lambda: int(os.getenv("SSH_PORT", "22")))
    ssh_user: str = field(default_factory=lambda: os.getenv("SSH_USER", "root"))
    ssh_password: str = field(default_factory=lambda: os.getenv("SSH_PASSWORD", ""))
    ssh_key_path: str = field(default_factory=lambda: os.getenv("SSH_KEY", ""))
    
    # Execution limits
    command_timeout: int = field(default_factory=lambda: int(os.getenv("COMMAND_TIMEOUT", "30")))
    max_output_size: int = field(default_factory=lambda: int(os.getenv("MAX_OUTPUT_SIZE", "8000")))
    max_stderr_size: int = field(default_factory=lambda: int(os.getenv("MAX_STDERR_SIZE", "2000")))
    
    # Rate limiting
    rate_limit_requests: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_REQUESTS", "30")))
    rate_limit_window: int = field(default_factory=lambda: int(os.getenv("RATE_LIMIT_WINDOW", "60")))
    
    # Logging
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    audit_log_file: str = field(default_factory=lambda: os.getenv("AUDIT_LOG_FILE", "terminal_audit.log"))


# Global config instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = Config()
    return _config


# ─────────────────────────────────────────────────────────────
# Logging Configuration
# ─────────────────────────────────────────────────────────────

config = get_config()

# Configure main logger
logging.basicConfig(
    level=getattr(logging, config.log_level.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Configure audit logger (separate file for security audits)
audit_logger = logging.getLogger("terminal_audit")
audit_logger.setLevel(logging.INFO)
audit_handler = logging.FileHandler(
    Path(__file__).parent / config.audit_log_file,
    encoding="utf-8"
)
audit_handler.setFormatter(logging.Formatter(
    "%(asctime)s | %(levelname)s | %(message)s"
))
audit_logger.addHandler(audit_handler)

# ─────────────────────────────────────────────────────────────
# Optional Dependencies
# ─────────────────────────────────────────────────────────────

try:
    import paramiko
    SSH_AVAILABLE = True
except ImportError:
    SSH_AVAILABLE = False
    logger.warning("paramiko not installed - SSH disabled (WSL still works)")

# ─────────────────────────────────────────────────────────────
# MCP Server Instance
# ─────────────────────────────────────────────────────────────

server = Server("terminal-server")

# ─────────────────────────────────────────────────────────────
# Security Configuration (Blocklist-only approach)
# ─────────────────────────────────────────────────────────────

# Blocked commands/patterns - these will NEVER be allowed
BLOCKED_COMMANDS = [
    # Destructive file operations
    "rm -rf /", "rm -rf ~", "rm -rf *", "rm -rf .",
    "rmdir /s", "del /s /q", "format c:",
    "mkfs", "dd if=",
    
    # System control (dangerous)
    "shutdown", "reboot", "poweroff", "halt", "init 0", "init 6",
    
    # User/permission manipulation
    "passwd", "useradd", "userdel", "usermod", "groupadd", "groupdel",
    "chmod 777", "chown -R",
    
    # Network attacks / backdoors
    "nc -l", "ncat -l",  # listening mode (backdoors)
    "nc -e", "ncat -e",  # execute mode
    
    # Dangerous shell operators (prevent command chaining/injection)
    "$(",   # command substitution
    "`",    # backtick command substitution
    
    # Fork bombs and resource exhaustion
    ":(){ :|:& };:",
    
    # Reverse shells
    "bash -i", "/dev/tcp/", "python -c 'import socket",
    "python3 -c 'import socket", "perl -e",
    
    # Credential/sensitive data access
    "/etc/shadow", ".ssh/id_rsa", ".ssh/id_ed25519",
    ".aws/credentials", ".azure/", ".gcp/",
    
    # History/log tampering
    "history -c", "history -w", "> /var/log", "shred",
    
    # Crypto miners
    "xmrig", "minerd", "cgminer", "bfgminer",
]

# Patterns that require extra caution - block these substrings
BLOCKED_PATTERNS = [
    # Prevent accidental recursive deletes
    "rm -rf",
    "rm -r /",
    "rm -fr",
    
    # Prevent disk destruction
    "> /dev/sd",
    "> /dev/nvme",
    "mkfs.",
    
    # Prevent sudo abuse with dangerous commands
    "sudo rm -rf",
    "sudo dd",
    "sudo mkfs",
    
    # Prevent breaking system config
    "visudo",
    "> /etc/",
    
    # Windows destructive
    "format ",
    "diskpart",
    "bcdedit",
    
    # Prevent encoded/obfuscated commands
    "base64 -d |",
    "| base64 -d",
    "eval $(",
]

# ─────────────────────────────────────────────────────────────
# Rate Limiting
# ─────────────────────────────────────────────────────────────

class RateLimiter:
    """Simple in-memory rate limiter."""
    
    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)
    
    def is_allowed(self, client_id: str = "default") -> Tuple[bool, str]:
        """Check if request is allowed under rate limit."""
        now = time.time()
        
        # Clean old requests outside the window
        self.requests[client_id] = [
            t for t in self.requests[client_id] 
            if now - t < self.window
        ]
        
        if len(self.requests[client_id]) >= self.max_requests:
            return False, f"Rate limit exceeded ({self.max_requests} requests per {self.window}s)"
        
        self.requests[client_id].append(now)
        return True, "OK"
    
    def get_remaining(self, client_id: str = "default") -> int:
        """Get remaining requests in current window."""
        now = time.time()
        recent = [t for t in self.requests[client_id] if now - t < self.window]
        return max(0, self.max_requests - len(recent))


# Global rate limiter instance
rate_limiter = RateLimiter(
    max_requests=config.rate_limit_requests,
    window_seconds=config.rate_limit_window
)

# ─────────────────────────────────────────────────────────────
# Audit Logging
# ─────────────────────────────────────────────────────────────

def audit_log(
    action: str,
    command: str,
    target: str,
    result: dict,
    client_id: str = "unknown"
) -> None:
    """Log command execution for security audits."""
    status = "SUCCESS" if result.get("ok") else "FAILED"
    exit_code = result.get("exit_code", "N/A")
    error = result.get("error", "")
    
    audit_logger.info(
        f"action={action} | client={client_id} | target={target} | "
        f"status={status} | exit_code={exit_code} | cmd={command[:100]} | "
        f"error={error[:50] if error else 'none'}"
    )

# ─────────────────────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────────────────────

def validate_command(command: str, target: str = "local") -> Tuple[bool, str]:
    """Validate command against blocklist only. LLM decides what to run."""
    cmd_lower = command.lower().strip()
    
    # Check for empty command
    parts = command.split()
    if not parts:
        return False, "Empty command"
    
    # Check blocked commands (exact substring matches)
    for blocked in BLOCKED_COMMANDS:
        if blocked.lower() in cmd_lower:
            logger.warning(f"Blocked command attempted: {command[:50]}")
            return False, f"Blocked command: {blocked}"
    
    # Check blocked patterns (substrings)
    for pattern in BLOCKED_PATTERNS:
        if pattern.lower() in cmd_lower:
            logger.warning(f"Blocked pattern attempted: {command[:50]}")
            return False, f"Blocked pattern: {pattern}"
    
    # All other commands are allowed - LLM decides
    return True, "OK"

# ─────────────────────────────────────────────────────────────
# Execution Functions
# ─────────────────────────────────────────────────────────────

def execute_local(command: str) -> dict:
    """Execute command on local Windows machine."""
    cfg = get_config()
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=cfg.command_timeout,
            cwd=os.path.expanduser("~")
        )
        
        # Filter out known informational messages from stderr
        stderr = result.stderr
        if stderr:
            stderr_lines = [
                line for line in stderr.split('\n')
                # nslookup's "Non-authoritative answer" is informational, not an error
                if not line.strip().startswith('Non-authoritative answer')
            ]
            stderr = '\n'.join(stderr_lines).strip()
        
        return {
            "ok": result.returncode == 0,
            "stdout": result.stdout[:cfg.max_output_size],
            "stderr": stderr[:cfg.max_stderr_size] if stderr else "",
            "exit_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        logger.warning(f"Command timed out: {command[:50]}")
        return {"ok": False, "error": f"Command timed out ({cfg.command_timeout}s)"}
    except Exception as e:
        logger.error(f"Local execution error: {e}")
        return {"ok": False, "error": str(e)}


def execute_wsl(command: str) -> dict:
    """Execute command directly in WSL (no SSH needed!)."""
    cfg = get_config()
    
    try:
        result = subprocess.run(
            ["wsl", "-d", cfg.wsl_distro, "-e", "bash", "-c", command],
            capture_output=True,
            text=True,
            timeout=cfg.command_timeout,
            cwd=os.path.expanduser("~")
        )
        
        # Filter out known WSL noise from stderr (not real errors)
        stderr = result.stderr
        if stderr:
            stderr_lines = [
                line for line in stderr.split('\n')
                if not ('WSL' in line and 'getpwuid' in line)
                and not line.startswith('<3>WSL')
                and not ('CreateProcessParseCommon' in line)
            ]
            stderr = '\n'.join(stderr_lines).strip()
        
        return {
            "ok": result.returncode == 0,
            "stdout": result.stdout[:cfg.max_output_size],
            "stderr": stderr[:cfg.max_stderr_size] if stderr else "",
            "exit_code": result.returncode,
            "target": f"wsl-{cfg.wsl_distro}",
            "method": "wsl"
        }
    except subprocess.TimeoutExpired:
        logger.warning(f"WSL command timed out: {command[:50]}")
        return {"ok": False, "error": f"Command timed out ({cfg.command_timeout}s)"}
    except FileNotFoundError:
        logger.error("WSL not found")
        return {"ok": False, "error": "WSL not found. Is it installed?"}
    except Exception as e:
        logger.error(f"WSL execution error: {e}")
        return {"ok": False, "error": str(e)}


def execute_ssh(command: str, ssh_config: Optional[dict] = None) -> dict:
    """Execute command on remote Linux VM via SSH."""
    if not SSH_AVAILABLE:
        return {"ok": False, "error": "paramiko not installed. Run: pip install paramiko"}
    
    cfg = get_config()
    
    # Use provided config or fall back to global config
    config_vals = ssh_config if ssh_config else {
        "host": cfg.ssh_host,
        "port": cfg.ssh_port,
        "username": cfg.ssh_user,
        "password": cfg.ssh_password,
        "key_path": cfg.ssh_key_path,
    }
    
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Build connection kwargs
        connect_kwargs = {
            "hostname": config_vals.get("host") or cfg.ssh_host,
            "port": config_vals.get("port") or cfg.ssh_port,
            "username": config_vals.get("username") or cfg.ssh_user,
            "timeout": 10
        }
        
        # Try key auth first, then password
        key_path = config_vals.get("key_path") or cfg.ssh_key_path
        password = config_vals.get("password") or cfg.ssh_password
        
        if key_path and os.path.exists(key_path):
            connect_kwargs["key_filename"] = key_path
        elif password:
            connect_kwargs["password"] = password
        else:
            return {"ok": False, "error": "No SSH credentials. Enter password in Settings (⚙️)."}
        
        client.connect(**connect_kwargs)
        
        stdin, stdout, stderr = client.exec_command(command, timeout=cfg.command_timeout)
        
        output = stdout.read().decode("utf-8")[:cfg.max_output_size]
        errors = stderr.read().decode("utf-8")[:cfg.max_stderr_size]
        exit_code = stdout.channel.recv_exit_status()
        
        client.close()
        
        return {
            "ok": exit_code == 0,
            "stdout": output,
            "stderr": errors,
            "exit_code": exit_code,
            "target": f"ssh-{connect_kwargs['hostname']}",
            "method": "ssh"
        }
        
    except paramiko.AuthenticationException:
        logger.error("SSH authentication failed")
        return {"ok": False, "error": "SSH auth failed. Check username/password in Settings."}
    except paramiko.SSHException as e:
        logger.error(f"SSH error: {e}")
        return {"ok": False, "error": f"SSH error: {str(e)}"}
    except Exception as e:
        logger.error(f"SSH execution error: {e}")
        return {"ok": False, "error": str(e)}


def execute_linux(command: str, ssh_config: Optional[dict] = None) -> dict:
    """Execute Linux command via WSL or SSH based on configuration."""
    cfg = get_config()
    
    if cfg.linux_method == "wsl":
        return execute_wsl(command)
    else:
        return execute_ssh(command, ssh_config)

# ─────────────────────────────────────────────────────────────
# MCP Tool Handlers
# ─────────────────────────────────────────────────────────────

def handle_execute_command(arguments: dict) -> dict:
    """Handle the execute_command tool call."""
    cfg = get_config()
    
    command = arguments.get("command", "")
    target = arguments.get("target", "local")
    ssh_host = arguments.get("ssh_host")
    ssh_port = arguments.get("ssh_port")
    ssh_user = arguments.get("ssh_user")
    ssh_password = arguments.get("ssh_password")
    
    # Check rate limit
    allowed, reason = rate_limiter.is_allowed()
    if not allowed:
        logger.warning(f"Rate limit exceeded for command: {command[:30]}")
        return {"ok": False, "error": reason}
    
    # Validate command
    allowed, reason = validate_command(command, target)
    if not allowed:
        audit_log("BLOCKED", command, target, {"ok": False, "error": reason})
        return {"ok": False, "error": reason, "command": command}
    
    # Build SSH config from parameters if provided
    ssh_config = None
    if target == "linux" and ssh_password:
        ssh_config = {
            "host": ssh_host or cfg.ssh_host,
            "port": ssh_port or cfg.ssh_port,
            "username": ssh_user or cfg.ssh_user,
            "password": ssh_password,
        }
    
    # Execute based on target
    if target == "linux":
        result = execute_linux(command, ssh_config)
    else:
        result = execute_local(command)
    
    # Audit log the execution
    audit_log("EXECUTE", command, target, result)
    
    return result


def handle_list_targets(arguments: dict) -> dict:
    """Handle the list_targets tool call."""
    cfg = get_config()
    
    ssh_host = arguments.get("ssh_host")
    ssh_port = arguments.get("ssh_port")
    ssh_user = arguments.get("ssh_user")
    ssh_password = arguments.get("ssh_password")
    
    targets = [
        {"id": "local", "name": "Local Windows", "status": "available", "method": "subprocess"}
    ]
    
    # Build SSH config from parameters
    ssh_config = {
        "host": ssh_host or cfg.ssh_host,
        "port": ssh_port or cfg.ssh_port,
        "username": ssh_user or cfg.ssh_user,
        "password": ssh_password or cfg.ssh_password,
    }
    
    # Check Linux target availability
    if ssh_password or cfg.linux_method == "ssh":
        if SSH_AVAILABLE:
            try:
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                
                connect_kwargs = {
                    "hostname": ssh_config["host"],
                    "port": ssh_config["port"],
                    "username": ssh_config["username"],
                    "timeout": 5
                }
                
                key_path = cfg.ssh_key_path
                if key_path and os.path.exists(key_path):
                    connect_kwargs["key_filename"] = key_path
                elif ssh_config["password"]:
                    connect_kwargs["password"] = ssh_config["password"]
                else:
                    targets.append({
                        "id": "linux",
                        "name": f"SSH ({ssh_config['host']})",
                        "status": "offline",
                        "method": "ssh",
                        "hint": "Enter SSH password in Settings"
                    })
                    return {"targets": targets}
                
                client.connect(**connect_kwargs)
                client.close()
                
                targets.append({
                    "id": "linux",
                    "name": f"SSH ({ssh_config['host']})",
                    "status": "available",
                    "method": "ssh"
                })
            except Exception as e:
                logger.debug(f"SSH connection check failed: {e}")
                targets.append({
                    "id": "linux",
                    "name": f"SSH ({ssh_config['host']})",
                    "status": "offline",
                    "method": "ssh",
                    "hint": str(e)
                })
        else:
            targets.append({
                "id": "linux",
                "name": "SSH",
                "status": "offline",
                "method": "ssh",
                "hint": "paramiko not installed"
            })
    else:
        # Fallback to WSL
        try:
            result = subprocess.run(
                ["wsl", "-d", cfg.wsl_distro, "-e", "echo", "ok"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0 and "ok" in result.stdout:
                targets.append({
                    "id": "linux",
                    "name": f"WSL ({cfg.wsl_distro})",
                    "status": "available",
                    "method": "wsl"
                })
            else:
                targets.append({
                    "id": "linux",
                    "name": f"WSL ({cfg.wsl_distro})",
                    "status": "offline",
                    "method": "wsl",
                    "hint": "Configure SSH in Settings"
                })
        except Exception as e:
            logger.debug(f"WSL check failed: {e}")
            targets.append({
                "id": "linux",
                "name": "Linux",
                "status": "offline",
                "method": "ssh",
                "hint": "Configure SSH in Settings"
            })
    
    return {"targets": targets}


def handle_health_check(arguments: dict) -> dict:
    """Handle the health_check tool call."""
    cfg = get_config()
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "ssh_available": SSH_AVAILABLE,
        "linux_method": cfg.linux_method,
        "rate_limit": {
            "remaining": rate_limiter.get_remaining(),
            "max_requests": cfg.rate_limit_requests,
            "window_seconds": cfg.rate_limit_window
        },
        "config": {
            "command_timeout": cfg.command_timeout,
            "max_output_size": cfg.max_output_size
        }
    }

# ─────────────────────────────────────────────────────────────
# MCP Server Setup
# ─────────────────────────────────────────────────────────────

@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools."""
    return [
        Tool(
            name="execute_command",
            description="Execute a diagnostic command on local Windows or remote Linux",
            inputSchema={
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The command to execute"
                    },
                    "target": {
                        "type": "string",
                        "enum": ["local", "linux"],
                        "description": "Target: 'local' for Windows, 'linux' for Linux VM/WSL",
                        "default": "local"
                    },
                    "ssh_host": {
                        "type": "string",
                        "description": "SSH host (optional, overrides config)"
                    },
                    "ssh_port": {
                        "type": "integer",
                        "description": "SSH port (optional, overrides config)"
                    },
                    "ssh_user": {
                        "type": "string",
                        "description": "SSH username (optional, overrides config)"
                    },
                    "ssh_password": {
                        "type": "string",
                        "description": "SSH password (optional, overrides config)"
                    }
                },
                "required": ["command"]
            }
        ),
        Tool(
            name="list_targets",
            description="List available execution targets (local Windows, Linux VM/WSL)",
            inputSchema={
                "type": "object",
                "properties": {
                    "ssh_host": {
                        "type": "string",
                        "description": "SSH host to check"
                    },
                    "ssh_port": {
                        "type": "integer",
                        "description": "SSH port"
                    },
                    "ssh_user": {
                        "type": "string",
                        "description": "SSH username"
                    },
                    "ssh_password": {
                        "type": "string",
                        "description": "SSH password"
                    }
                }
            }
        ),
        Tool(
            name="health_check",
            description="Check server health and connectivity status",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
    import json
    
    handlers = {
        "execute_command": handle_execute_command,
        "list_targets": handle_list_targets,
        "health_check": handle_health_check,
    }
    
    handler = handlers.get(name)
    if not handler:
        result = {"ok": False, "error": f"Unknown tool: {name}"}
    else:
        result = handler(arguments)
    
    return [TextContent(type="text", text=json.dumps(result, indent=2))]

# ─────────────────────────────────────────────────────────────
# Main Entry Point
# ─────────────────────────────────────────────────────────────

async def main():
    """Run the MCP server."""
    logger.info("=" * 50)
    logger.info("Terminal Server starting...")
    logger.info(f"Linux method: {config.linux_method}")
    logger.info(f"SSH available: {SSH_AVAILABLE}")
    logger.info(f"Rate limit: {config.rate_limit_requests} requests per {config.rate_limit_window}s")
    logger.info("=" * 50)
    
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
