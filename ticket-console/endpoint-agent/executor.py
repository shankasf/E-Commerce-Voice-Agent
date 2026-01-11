"""
Sandboxed Command Executor

Executes diagnostic commands with security constraints:
1. No shell interpretation (subprocess with argument array)
2. Timeout enforcement
3. Non-admin execution
4. Output sanitization
"""

import subprocess
import logging
import os
import sys
from typing import Dict, Any, Optional
from dataclasses import dataclass

from diagnostics import DiagnosticTemplate, get_diagnostic
from sanitizer import sanitize_output, sanitize_error
from config import get_config
from blocked_commands import is_command_blocked, validate_command_safety

logger = logging.getLogger(__name__)

@dataclass
class ExecutionResult:
    """Result of a diagnostic execution."""
    success: bool
    diagnostic_id: str
    stdout: str
    stderr: str
    exit_code: int
    truncated: bool
    redactions: int
    warnings: list
    execution_time_ms: int
    error: Optional[str] = None


def execute_diagnostic(
    diagnostic_id: str,
    params: Dict[str, str] = None,
    timeout: int = None
) -> ExecutionResult:
    """
    Execute a diagnostic by ID.
    
    This is the ONLY way to run commands - no raw shell commands accepted.
    
    Args:
        diagnostic_id: The ID of the diagnostic to run
        params: Parameters to substitute into the command
        timeout: Override timeout (uses diagnostic default if not specified)
    
    Returns:
        ExecutionResult with sanitized output
    """
    import time
    start_time = time.time()
    
    config = get_config()
    params = params or {}
    
    # Step 1: Get the diagnostic template
    diagnostic = get_diagnostic(diagnostic_id)
    if not diagnostic:
        return ExecutionResult(
            success=False,
            diagnostic_id=diagnostic_id,
            stdout="",
            stderr="",
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[],
            execution_time_ms=0,
            error=f"Unknown diagnostic: {diagnostic_id}"
        )
    
    # Step 2: Validate parameters
    valid, reason = diagnostic.validate_params(params)
    if not valid:
        return ExecutionResult(
            success=False,
            diagnostic_id=diagnostic_id,
            stdout="",
            stderr="",
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[],
            execution_time_ms=0,
            error=f"Parameter validation failed: {reason}"
        )
    
    # Step 3: Build the command (no shell interpretation!)
    command = diagnostic.build_command(params)
    effective_timeout = timeout or diagnostic.timeout or config.command_timeout
    
    logger.info(f"Executing diagnostic: {diagnostic_id}")
    logger.debug(f"Command: {command}")
    
    # Step 4: Execute with security constraints
    try:
        # CRITICAL: shell=False prevents shell injection
        # We pass an argument array, not a string
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=effective_timeout,
            shell=False,  # NEVER use shell=True
            cwd=os.path.expanduser("~"),  # Run in user's home directory
            env=_get_safe_env(),  # Restricted environment
        )
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        # Step 5: Sanitize output
        stdout_result = sanitize_output(result.stdout, config.max_output_size)
        stderr_sanitized = sanitize_error(result.stderr)
        
        return ExecutionResult(
            success=result.returncode == 0,
            diagnostic_id=diagnostic_id,
            stdout=stdout_result["output"],
            stderr=stderr_sanitized,
            exit_code=result.returncode,
            truncated=stdout_result["truncated"],
            redactions=stdout_result["redactions"],
            warnings=stdout_result["warnings"],
            execution_time_ms=execution_time_ms,
        )
        
    except subprocess.TimeoutExpired:
        execution_time_ms = int((time.time() - start_time) * 1000)
        logger.warning(f"Diagnostic {diagnostic_id} timed out after {effective_timeout}s")
        
        return ExecutionResult(
            success=False,
            diagnostic_id=diagnostic_id,
            stdout="",
            stderr="",
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[],
            execution_time_ms=execution_time_ms,
            error=f"Command timed out after {effective_timeout} seconds"
        )
        
    except FileNotFoundError as e:
        execution_time_ms = int((time.time() - start_time) * 1000)
        logger.error(f"Command not found: {command[0]}")
        
        return ExecutionResult(
            success=False,
            diagnostic_id=diagnostic_id,
            stdout="",
            stderr="",
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[],
            execution_time_ms=execution_time_ms,
            error=f"Command not found: {command[0]}"
        )
        
    except Exception as e:
        execution_time_ms = int((time.time() - start_time) * 1000)
        logger.error(f"Execution error: {e}")
        
        return ExecutionResult(
            success=False,
            diagnostic_id=diagnostic_id,
            stdout="",
            stderr="",
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[],
            execution_time_ms=execution_time_ms,
            error=f"Execution error: {str(e)}"
        )


def _get_safe_env() -> Dict[str, str]:
    """
    Get a restricted environment for command execution.
    
    We don't pass through all environment variables to prevent
    information leakage and potential manipulation.
    """
    safe_vars = [
        'PATH',
        'SYSTEMROOT',
        'WINDIR',
        'COMSPEC',
        'TEMP',
        'TMP',
        'USERNAME',
        'USERPROFILE',
        'HOMEDRIVE',
        'HOMEPATH',
        'COMPUTERNAME',
        'NUMBER_OF_PROCESSORS',
        'PROCESSOR_ARCHITECTURE',
        'OS',
        # For PowerShell
        'PSModulePath',
    ]
    
    env = {}
    for var in safe_vars:
        if var in os.environ:
            env[var] = os.environ[var]
    
    return env


def check_admin_status() -> bool:
    """Check if the agent is running with admin privileges."""
    if sys.platform == 'win32':
        try:
            import ctypes
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        except:
            return False
    else:
        return os.geteuid() == 0


def execute_command_raw(
    command: str,
    timeout: int = 30
) -> ExecutionResult:
    """
    Execute ANY command (not just diagnostics) with blacklist validation.
    
    This is the new approach: allow all commands except blocked ones.
    
    Args:
        command: The raw command string to execute
        timeout: Maximum execution time in seconds
        
    Returns:
        ExecutionResult with sanitized output
    """
    import time
    import shlex
    
    start_time = time.time()
    
    # Step 1: Check if command is blocked
    is_blocked, block_reason = is_command_blocked(command)
    if is_blocked:
        return ExecutionResult(
            success=False,
            diagnostic_id="raw_command",
            stdout="",
            stderr="",
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[f"Command blocked: {block_reason}"],
            execution_time_ms=0,
            error=f"Command is blocked: {block_reason}"
        )
    
    # Step 2: Validate safety and get risk level
    is_safe, risk_level, safety_reason = validate_command_safety(command)
    if not is_safe:
        return ExecutionResult(
            success=False,
            diagnostic_id="raw_command",
            stdout="",
            stderr="",
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[f"Command unsafe: {safety_reason}"],
            execution_time_ms=0,
            error=f"Command is unsafe: {safety_reason}"
        )
    
    # Step 3: Parse command safely (split into array)
    try:
        # Use shlex for safe parsing (handles quotes, spaces)
        if sys.platform == "win32":
            # Windows: split manually (shlex doesn't work well on Windows)
            import re
            # Simple split that handles quoted strings
            parts = re.findall(r'(?:[^\s"]+|"[^"]*")+', command)
            parts = [p.strip('"') for p in parts]
        else:
            # Unix: use shlex
            parts = shlex.split(command)
    except Exception as e:
        return ExecutionResult(
            success=False,
            diagnostic_id="raw_command",
            stdout="",
            stderr=f"Command parsing error: {e}",
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[],
            execution_time_ms=0,
            error=f"Failed to parse command: {e}"
        )
    
    if not parts:
        return ExecutionResult(
            success=False,
            diagnostic_id="raw_command",
            stdout="",
            stderr="Empty command",
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[],
            execution_time_ms=0,
            error="Empty command"
        )
    
    # Step 4: Execute (still with shell=False for security)
    config = get_config()
    effective_timeout = timeout or config.command_timeout
    
    logger.info(f"Executing raw command: {command}")
    logger.debug(f"Parsed parts: {parts}")
    
    try:
        result = subprocess.run(
            parts,  # Array, not string
            shell=False,  # CRITICAL: No shell interpretation
            timeout=effective_timeout,
            capture_output=True,
            text=True,
            cwd=os.path.expanduser("~"),  # Run in user's home directory
            env=_get_safe_env(),  # Sanitized environment
        )
        
        execution_time = int((time.time() - start_time) * 1000)
        
        # Step 5: Sanitize output
        stdout_result = sanitize_output(result.stdout, config.max_output_size)
        stderr_sanitized = sanitize_error(result.stderr)
        
        warnings = stdout_result["warnings"]
        if risk_level != "low":
            warnings.append(f"Risk level: {risk_level}")
        
        return ExecutionResult(
            success=result.returncode == 0,
            diagnostic_id="raw_command",
            stdout=stdout_result["output"],
            stderr=stderr_sanitized,
            exit_code=result.returncode,
            truncated=stdout_result["truncated"],
            redactions=stdout_result["redactions"],
            warnings=warnings,
            execution_time_ms=execution_time,
            error=None,
        )
        
    except subprocess.TimeoutExpired:
        return ExecutionResult(
            success=False,
            diagnostic_id="raw_command",
            stdout="",
            stderr="",
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[],
            execution_time_ms=int((time.time() - start_time) * 1000),
            error=f"Command timed out after {effective_timeout} seconds"
        )
    except FileNotFoundError as e:
        return ExecutionResult(
            success=False,
            diagnostic_id="raw_command",
            stdout="",
            stderr=f"Command not found: {parts[0] if parts else 'unknown'}",
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[],
            execution_time_ms=int((time.time() - start_time) * 1000),
            error=f"Command not found: {parts[0] if parts else 'unknown'}"
        )
    except Exception as e:
        return ExecutionResult(
            success=False,
            diagnostic_id="raw_command",
            stdout="",
            stderr=str(e),
            exit_code=-1,
            truncated=False,
            redactions=0,
            warnings=[],
            execution_time_ms=int((time.time() - start_time) * 1000),
            error=f"Execution error: {e}"
        )


def get_executor_info() -> Dict[str, Any]:
    """Get information about the executor environment."""
    return {
        "platform": sys.platform,
        "python_version": sys.version,
        "is_admin": check_admin_status(),
        "username": os.environ.get("USERNAME", os.environ.get("USER", "unknown")),
        "hostname": os.environ.get("COMPUTERNAME", os.environ.get("HOSTNAME", "unknown")),
    }

