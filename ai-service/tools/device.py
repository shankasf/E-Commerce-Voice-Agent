"""
Device Tools for URackIT AI Service.

Provides tools for AI agents to execute PowerShell commands on connected Windows devices.
The AI decides what commands to run based on the troubleshooting context.
"""

import asyncio
import logging
import uuid
from typing import Any, Dict, Optional

from agents import function_tool

logger = logging.getLogger(__name__)


@function_tool
async def execute_powershell(
    session_id: str,
    command: str,
    description: str,
    timeout_seconds: int = 120,
) -> str:
    """
    Execute a PowerShell command on the connected Windows device.

    Use this tool to run diagnostic commands and fixes on the user's computer.
    You decide what PowerShell commands to run based on the troubleshooting context.

    IMPORTANT: Every command requires user consent before execution.
    The user will see the command description and must approve it.

    Args:
        session_id: The chat session ID (from context)
        command: The actual PowerShell command to execute (e.g., "Get-Process | Select-Object -First 10 Name, CPU")
        description: Human-readable description shown to user (e.g., "Check running processes")
        timeout_seconds: How long to wait for command result (default 120 seconds)

    Returns:
        Command output as string, or error message if failed.

    Examples of diagnostic commands:
        - Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion | ConvertTo-Json
        - Get-Process | Sort-Object CPU -Descending | Select-Object -First 20 Name, Id, CPU | ConvertTo-Json
        - Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free | ConvertTo-Json
        - Get-NetAdapter | Select-Object Name, Status, LinkSpeed | ConvertTo-Json
        - Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object -First 20 Name, DisplayName | ConvertTo-Json

    Examples of fix commands:
        - Restart-Service -Name 'Spooler' -Force
        - Stop-Process -Name 'chrome' -Force
        - Clear-DnsClientCache
        - Restart-Computer -Force
    """
    from websocket.device_handler import device_connection_manager

    # Find the device handler by chat session
    handler = device_connection_manager.get_by_chat_session(session_id)
    if not handler:
        return "Error: Device is not connected. Please ask the user to connect their device first using the 6-digit code."

    if not handler.is_authenticated or not handler.is_connected:
        return "Error: Device connection is not active. The device may have disconnected."

    try:
        # Generate command ID for tracking
        command_id = str(uuid.uuid4())

        # Send the PowerShell command to Windows app (always requires consent)
        sent = await handler.send_powershell_command(
            command_id=command_id,
            command=command,
            description=description,
            requires_consent=True,  # Always require user consent
        )

        if not sent:
            return "Error: Failed to send command. Device connection may have been lost."

        # Wait for result
        result = await handler.wait_for_command_result(command_id, timeout_seconds)

        if result is None:
            return f"Command timed out after {timeout_seconds} seconds. The device may be unresponsive or disconnected."

        if result.get("status") == "success":
            output = result.get("output", "")
            return f"Command completed successfully:\n{output}"
        elif result.get("status") == "declined":
            reason = result.get("reason", "User declined")
            return f"User declined the command: {reason}\n\nPlease provide manual instructions for the user to perform this step themselves."
        elif result.get("status") == "error":
            error = result.get("error", "Unknown error")
            if "disconnected" in error.lower():
                return "Error: Device disconnected during command execution. Ask the user to reconnect."
            return f"Command failed: {error}"
        else:
            return f"Unexpected result: {result}"

    except Exception as e:
        logger.error(f"Error executing PowerShell command: {e}")
        return f"Error: {str(e)}"


@function_tool
def check_device_connection(session_id: str) -> str:
    """
    Check if the user's device is currently connected.

    Use this before attempting to execute commands.

    Args:
        session_id: The chat session ID (from context)

    Returns:
        Connection status and device information.
    """
    from websocket.device_handler import device_connection_manager

    handler = device_connection_manager.get_by_chat_session(session_id)

    if not handler:
        return "Device is NOT connected. Ask the user to connect their device using the 6-digit code from the Windows app."

    if not handler.is_authenticated or not handler.is_connected:
        return "Device connection exists but is not active. The device may have disconnected."

    return (
        f"Device is connected and ready for commands.\n"
        f"  Device ID: {handler.device_id}\n"
        f"  User ID: {handler.user_id}\n"
        f"  Connection active: {handler.is_connected}\n"
        f"  Last heartbeat: {handler.last_heartbeat.isoformat()}"
    )
