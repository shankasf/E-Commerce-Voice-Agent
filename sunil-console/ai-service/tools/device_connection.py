"""
Device Connection Tools for URackIT AI Service.

Provides MCP tool for generating 6-digit pairing codes for device connections.
This tool calls the ticket-console API to create secure device connections.
"""

import os
import logging
import requests
from typing import List, Optional
from pydantic import BaseModel, Field

from agents import function_tool

logger = logging.getLogger(__name__)

# Configuration from environment
TICKET_CONSOLE_URL = os.getenv("NEXTJS_API_URL", "https://localhost:3001")
AI_SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY", "")


# ============================================================================
# Pydantic Models for Structured Output
# ============================================================================

class DeviceInfo(BaseModel):
    """Structured device information."""
    device_id: int = Field(description="The unique device ID - USE THIS VALUE for generate_device_connection_code")
    asset_name: str = Field(description="Human-readable device name")
    status: str = Field(description="Device status: ONLINE or OFFLINE")
    host_name: Optional[str] = Field(default=None, description="Device hostname")


class GetUserDevicesResult(BaseModel):
    """Structured result from get_user_devices tool."""
    success: bool = Field(description="Whether the operation succeeded")
    devices: List[DeviceInfo] = Field(default_factory=list, description="List of devices assigned to user")
    message: str = Field(description="Human-readable message to show user")
    error: Optional[str] = Field(default=None, description="Error message if failed")

    def to_tool_response(self) -> str:
        """Convert to JSON string for tool response."""
        return self.model_dump_json(indent=2)


class GenerateCodeResult(BaseModel):
    """Structured result from generate_device_connection_code tool."""
    success: bool = Field(description="Whether the code was generated")
    code: Optional[str] = Field(default=None, description="The 6-digit connection code")
    device_id: Optional[int] = Field(default=None, description="The device ID used")
    device_name: Optional[str] = Field(default=None, description="The device name")
    websocket_url: str = Field(default="wss://localhost:8080/ws/device", description="WebSocket URL for Windows app to connect")
    message: str = Field(description="Human-readable message to show user")
    error: Optional[str] = Field(default=None, description="Error message if failed")
    valid_devices: Optional[List[DeviceInfo]] = Field(default=None, description="If device_id was invalid, these are the valid options")

    def to_tool_response(self) -> str:
        """Convert to JSON string for tool response."""
        return self.model_dump_json(indent=2)


# ============================================================================
# Tool Functions
# ============================================================================

@function_tool
def generate_device_connection_code(
    user_id: int,
    organization_id: int,
    device_id: int,
    chat_session_id: str,
) -> str:
    """
    Generate a 6-digit pairing code for establishing a secure connection
    between the AI service and a Windows device.

    CRITICAL: The device_id parameter MUST be a value from the get_user_devices result.
    Do NOT guess or assume device IDs. Always call get_user_devices first.

    Args:
        user_id: The contact/user ID requesting the connection
        organization_id: The organization ID the user belongs to
        device_id: The device ID from get_user_devices result (MUST match exactly)
        chat_session_id: The AI chat session ID (links device connection to chat)

    Returns:
        JSON with success status, connection code, and details.
    """
    # DEBUG: Log exactly what parameters the AI passed
    print(f"\n{'='*60}")
    print(f"[DEBUG] generate_device_connection_code CALLED")
    print(f"[DEBUG] Parameters received from AI:")
    print(f"[DEBUG]   user_id = {user_id} (type: {type(user_id).__name__})")
    print(f"[DEBUG]   organization_id = {organization_id} (type: {type(organization_id).__name__})")
    print(f"[DEBUG]   device_id = {device_id} (type: {type(device_id).__name__})")
    print(f"[DEBUG]   chat_session_id = {chat_session_id}")
    print(f"{'='*60}\n")
    logger.info(f"[DEBUG] generate_device_connection_code called with device_id={device_id}")

    if not user_id or not organization_id or not chat_session_id:
        return GenerateCodeResult(
            success=False,
            message="Missing required information.",
            error="Please provide user_id, organization_id, and chat_session_id."
        ).to_tool_response()

    if not AI_SERVICE_API_KEY:
        logger.error("AI_SERVICE_API_KEY not configured")
        return GenerateCodeResult(
            success=False,
            message="Service configuration issue.",
            error="AI_SERVICE_API_KEY not configured. Contact support."
        ).to_tool_response()

    # AUTO-CORRECTION: Get user's actual devices and use correct device_id
    # This fixes the OpenAI hallucination issue where it sends wrong device_id
    from db.connection import get_db
    db = get_db()
    device_name = "Unknown"

    try:
        # First, get ALL devices assigned to this user
        all_devices_params = {
            "contact_id": f"eq.{user_id}",
            "unassigned_at": "is.null",
            "select": "device:device_id(device_id,asset_name,status,host_name)"
        }
        all_rows = db._make_request("GET", "contact_devices", params=all_devices_params)

        if not all_rows:
            return GenerateCodeResult(
                success=False,
                message="No devices found",
                error="User has no devices assigned. Contact administrator."
            ).to_tool_response()

        # Extract valid devices
        valid_devices = []
        for r in all_rows:
            d = r.get("device", {})
            if d:
                valid_devices.append({
                    "device_id": d.get("device_id"),
                    "asset_name": d.get("asset_name", "Unknown"),
                    "status": d.get("status", "UNKNOWN"),
                    "host_name": d.get("host_name")
                })

        if not valid_devices:
            return GenerateCodeResult(
                success=False,
                message="No devices found",
                error="User has no devices assigned. Contact administrator."
            ).to_tool_response()

        # Check if the provided device_id is valid
        valid_device_ids = [d["device_id"] for d in valid_devices]

        if device_id not in valid_device_ids:
            # AUTO-CORRECT: If user has only ONE device, use it automatically
            if len(valid_devices) == 1:
                corrected_device_id = valid_devices[0]["device_id"]
                device_name = valid_devices[0]["asset_name"]
                print(f"[DEBUG] AUTO-CORRECTING device_id: {device_id} -> {corrected_device_id}")
                logger.warning(f"Auto-correcting device_id from {device_id} to {corrected_device_id} (user has only one device)")
                device_id = corrected_device_id
            else:
                # User has multiple devices, can't auto-correct
                logger.error(f"Device {device_id} not valid. Valid devices: {valid_device_ids}")
                return GenerateCodeResult(
                    success=False,
                    message=f"Invalid device_id: {device_id}",
                    error=f"Device ID {device_id} is not assigned to this user. Valid device IDs are: {valid_device_ids}",
                    valid_devices=[DeviceInfo(
                        device_id=d["device_id"],
                        asset_name=d["asset_name"],
                        status=d["status"],
                        host_name=d["host_name"]
                    ) for d in valid_devices]
                ).to_tool_response()
        else:
            # device_id is valid, get the device name
            for d in valid_devices:
                if d["device_id"] == device_id:
                    device_name = d["asset_name"]
                    break

        logger.info(f"Device validated: {device_name} (ID: {device_id})")

    except Exception as e:
        logger.error(f"Error validating device: {e}")
        # Continue - ticket-console will do final validation

    # Call ticket-console API to create device connection
    try:
        url = f"{TICKET_CONSOLE_URL}/api/client-application/device-connections/create"

        headers = {
            "Content-Type": "application/json",
            "x-ai-service-key": AI_SERVICE_API_KEY,
        }

        payload = {
            "user_id": user_id,
            "organization_id": organization_id,
            "device_id": device_id,
            "chat_session_id": chat_session_id,
        }

        logger.info(f"Generating connection code for user {user_id}, device {device_id}")

        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()

        data = response.json()

        if data.get("success"):
            code = data.get("code", "")
            logger.info(f"Connection code generated successfully")

            # Get WebSocket URL from environment or use default
            ws_base_url = os.getenv("WS_BASE_URL", "localhost:8080")
            # Use wss:// for secure connections
            ws_protocol = "wss" if "://" not in ws_base_url else ""
            websocket_url = f"{ws_protocol}://{ws_base_url}/ws/device" if ws_protocol else f"{ws_base_url}/ws/device"

            return GenerateCodeResult(
                success=True,
                code=code,
                device_id=device_id,
                device_name=device_name,
                websocket_url=websocket_url,
                message=f"Connection code generated: {code}. Tell user to enter this code in their Windows app. Code expires in 15 minutes."
            ).to_tool_response()
        else:
            error = data.get("error", "Unknown error")
            logger.error(f"Failed to generate code: {error}")
            return GenerateCodeResult(
                success=False,
                message="Failed to generate connection code.",
                error=error
            ).to_tool_response()

    except requests.exceptions.Timeout:
        logger.error("Timeout while generating connection code")
        return GenerateCodeResult(
            success=False,
            message="Request timed out.",
            error="Please try again."
        ).to_tool_response()
    except requests.exceptions.ConnectionError:
        logger.error("Connection error while generating connection code")
        return GenerateCodeResult(
            success=False,
            message="Unable to reach service.",
            error="Please try again later."
        ).to_tool_response()
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error generating connection code: {e}")
        return GenerateCodeResult(
            success=False,
            message="Error generating connection code.",
            error=str(e)
        ).to_tool_response()
    except Exception as e:
        logger.error(f"Unexpected error generating connection code: {e}")
        return GenerateCodeResult(
            success=False,
            message="Unexpected error occurred.",
            error=str(e)
        ).to_tool_response()


@function_tool
def get_user_devices(user_id: int, organization_id: int) -> str:
    """
    Get list of devices assigned to a user.

    CRITICAL ANTI-HALLUCINATION RULES:
    - The response contains a 'devices' array with REAL device_id values from the database
    - You MUST use the EXACT device_id from this response - NEVER make up a device_id
    - If creating a ticket, use device_id from this list
    - If user selects by number (1, 2, 3), map it to the corresponding device_id

    Args:
        user_id: The contact/user ID
        organization_id: The organization ID

    Returns:
        JSON with numbered devices list. Each device has device_id, asset_name, status.
    """
    # DEBUG: Log what parameters the AI passed
    print(f"\n{'='*60}")
    print(f"[DEBUG] get_user_devices CALLED")
    print(f"[DEBUG] Parameters received from AI:")
    print(f"[DEBUG]   user_id = {user_id} (type: {type(user_id).__name__})")
    print(f"[DEBUG]   organization_id = {organization_id} (type: {type(organization_id).__name__})")
    print(f"{'='*60}\n")
    logger.info(f"[DEBUG] get_user_devices called with user_id={user_id}, org_id={organization_id}")

    from db.connection import get_db

    db = get_db()

    try:
        params = {
            "contact_id": f"eq.{user_id}",
            "unassigned_at": "is.null",
            "select": "device:device_id(device_id,asset_name,status,host_name,serial_no)"
        }
        rows = db._make_request("GET", "contact_devices", params=params)

        if not rows:
            return GetUserDevicesResult(
                success=False,
                devices=[],
                message="No devices assigned to this user.",
                error="Contact administrator to register a device."
            ).to_tool_response()

        # Extract device objects
        devices = []
        for r in rows:
            d = r.get("device", {})
            if d:
                devices.append(DeviceInfo(
                    device_id=d.get("device_id"),
                    asset_name=d.get("asset_name", "Unknown"),
                    status=d.get("status", "UNKNOWN"),
                    host_name=d.get("host_name")
                ))

        if not devices:
            return GetUserDevicesResult(
                success=False,
                devices=[],
                message="No devices found for this account.",
                error="Contact administrator."
            ).to_tool_response()

        # Build user-friendly numbered message
        device_list = []
        for i, d in enumerate(devices, 1):
            status_icon = "ONLINE" if d.status == "ONLINE" else "OFFLINE"
            device_list.append(f"{i}. {d.asset_name} (device_id={d.device_id}, status={status_icon})")

        message = f"Found {len(devices)} device(s):\n" + "\n".join(device_list)
        message += "\n\nIMPORTANT: Ask user to select by number or name. Use the EXACT device_id shown above - NEVER make up a device_id."

        result = GetUserDevicesResult(
            success=True,
            devices=devices,
            message=message
        )
        response = result.to_tool_response()

        # DEBUG: Print what we're returning to the AI
        print(f"\n{'='*60}")
        print(f"[DEBUG] get_user_devices RETURNING:")
        print(response)
        print(f"{'='*60}\n")
        logger.info(f"[DEBUG] get_user_devices returning {len(devices)} devices")

        return response

    except Exception as e:
        logger.error(f"Error fetching user devices: {e}")
        return GetUserDevicesResult(
            success=False,
            devices=[],
            message="Error retrieving devices.",
            error=str(e)
        ).to_tool_response()
