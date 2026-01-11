"""
Authentication & Token Management

Handles device identity and token validation for the endpoint agent.
"""

import json
import os
import base64
import hashlib
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import sys

logger = logging.getLogger(__name__)

@dataclass
class DeviceIdentity:
    """Device identity information."""
    device_id: str
    device_name: str
    device_token: str
    enrolled_at: str
    relay_url: str


# Handle PyInstaller bundle - store config in user's home directory
if getattr(sys, 'frozen', False):
    # Running as compiled executable - use user's home directory
    CONFIG_DIR = Path.home() / "RemoteSupportAgent"
    CONFIG_DIR.mkdir(exist_ok=True)
    CONFIG_FILE = CONFIG_DIR / "agent_config.json"
else:
    # Running as script - use script directory
    CONFIG_FILE = Path(__file__).parent / "agent_config.json"


def save_identity(identity: DeviceIdentity) -> bool:
    """Save device identity to config file."""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(asdict(identity), f, indent=2)
        logger.info(f"Identity saved to {CONFIG_FILE}")
        return True
    except Exception as e:
        logger.error(f"Failed to save identity: {e}")
        return False


def load_identity() -> Optional[DeviceIdentity]:
    """Load device identity from config file."""
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r') as f:
                data = json.load(f)
                return DeviceIdentity(**data)
    except Exception as e:
        logger.error(f"Failed to load identity: {e}")
    return None


def clear_identity():
    """Clear saved device identity."""
    try:
        if CONFIG_FILE.exists():
            CONFIG_FILE.unlink()
            logger.info("Identity cleared")
    except Exception as e:
        logger.error(f"Failed to clear identity: {e}")


def get_machine_fingerprint() -> str:
    """
    Generate a fingerprint for this machine.
    Used for device binding verification.
    """
    import platform
    import uuid
    
    # Collect machine-specific information
    info_parts = [
        platform.node(),  # Computer name
        platform.machine(),  # Machine type
        platform.processor(),  # Processor info
        str(uuid.getnode()),  # MAC address
    ]
    
    # Hash it for privacy
    fingerprint = hashlib.sha256(
        '|'.join(info_parts).encode()
    ).hexdigest()[:32]
    
    return fingerprint


def validate_session_token(token: str) -> Dict[str, Any]:
    """
    Validate a session token.
    
    In this simple implementation, tokens are base64-encoded payloads.
    In production, use proper JWT with signature verification.
    
    Returns:
        {
            "valid": bool,
            "device_id": str | None,
            "ticket_id": int | None,
            "expired": bool,
            "error": str | None
        }
    """
    try:
        # Decode the token
        decoded = base64.b64decode(token).decode('utf-8')
        parts = decoded.split(':')
        
        if len(parts) != 3:
            return {"valid": False, "error": "Invalid token format"}
        
        device_id, ticket_id, expiry = parts
        
        # Check expiry
        expiry_dt = datetime.fromisoformat(expiry)
        now = datetime.now(timezone.utc)
        
        if expiry_dt < now:
            return {
                "valid": False,
                "device_id": device_id,
                "ticket_id": int(ticket_id),
                "expired": True,
                "error": "Token expired"
            }
        
        return {
            "valid": True,
            "device_id": device_id,
            "ticket_id": int(ticket_id),
            "expired": False,
            "error": None
        }
        
    except Exception as e:
        return {"valid": False, "error": f"Token validation failed: {str(e)}"}


def generate_device_name() -> str:
    """Generate a default device name."""
    import platform
    return f"{platform.node()}"

