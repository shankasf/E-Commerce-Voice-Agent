"""
WebSocket Authentication for Device Connections.

Handles 6-digit code validation with security measures:
- SHA-256 hashed codes stored in DB
- 15-minute expiration
- One-time use
- Rate limiting via separate module
"""

import hashlib
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from db.connection import get_db

logger = logging.getLogger(__name__)

# Code expiration time in seconds
CODE_EXPIRATION_SECONDS = 15 * 60  # 15 minutes


@dataclass
class AuthResult:
    """Result of authentication attempt."""
    success: bool
    connection_id: Optional[str] = None
    device_id: Optional[int] = None
    user_id: Optional[int] = None
    organization_id: Optional[int] = None
    chat_session_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class AuthParams:
    """Parameters for authentication."""
    code: str
    user_id: int
    organization_id: int
    device_id: int


def _hash_code(code: str) -> str:
    """Hash the 6-digit code using SHA-256."""
    return hashlib.sha256(code.upper().encode()).hexdigest()


def _fail(code: str, message: str) -> AuthResult:
    """Create a failure result."""
    return AuthResult(success=False, error_code=code, error_message=message)


async def validate_connection_code(params: AuthParams) -> AuthResult:
    """
    Validate 6-digit connection code and auth parameters.

    Checks:
    1. Code exists in database (hashed)
    2. Code not already used
    3. Code not expired (15 min)
    4. No active connection using this code
    5. user_id, organization_id, device_id match stored values

    Args:
        params: Authentication parameters

    Returns:
        AuthResult with success status and connection details
    """
    code = params.code.strip().upper()

    # Basic validation
    if not code or len(code) != 6:
        logger.warning("Invalid code format")
        return _fail("INVALID_CODE", "Code must be 6 characters")

    try:
        db = get_db()
        hashed_code = _hash_code(code)

        # Lookup connection by hashed code
        result = db.select(
            "device_connections",
            columns="connection_id, device_id, user_id, organization_id, chat_session_id, is_active, used, created_at",
            filters={"six_digit_code": f"eq.{hashed_code}"},
            limit=1,
        )

        if not result:
            logger.warning("Code not found in database")
            return _fail("CODE_NOT_FOUND", "Invalid code")

        connection = result[0]

        # Check if already used
        if connection.get("used"):
            logger.warning("Code already used")
            return _fail("CODE_USED", "Code has already been used")

        # Check if already active
        if connection.get("is_active"):
            logger.warning("Code already has active connection")
            return _fail("CODE_ACTIVE", "Code already has an active connection")

        # Check expiration
        created_at = datetime.fromisoformat(connection["created_at"].replace("Z", "+00:00"))
        age_seconds = (datetime.utcnow() - created_at.replace(tzinfo=None)).total_seconds()

        if age_seconds > CODE_EXPIRATION_SECONDS:
            logger.warning(f"Code expired (age={age_seconds:.0f}s)")
            return _fail("CODE_EXPIRED", "Code has expired")

        # Validate parameters match stored values
        db_user_id = connection["user_id"]
        db_org_id = connection["organization_id"]
        db_device_id = connection["device_id"]

        if int(params.user_id) != db_user_id:
            logger.warning(f"user_id mismatch: {params.user_id} != {db_user_id}")
            return _fail("PARAM_MISMATCH", "Authentication parameters do not match")

        if int(params.organization_id) != db_org_id:
            logger.warning(f"organization_id mismatch: {params.organization_id} != {db_org_id}")
            return _fail("PARAM_MISMATCH", "Authentication parameters do not match")

        if int(params.device_id) != db_device_id:
            logger.warning(f"device_id mismatch: {params.device_id} != {db_device_id}")
            return _fail("PARAM_MISMATCH", "Authentication parameters do not match")

        # Success
        logger.info(f"Code validated: device={db_device_id}, user={db_user_id}")
        return AuthResult(
            success=True,
            connection_id=str(connection["connection_id"]),
            device_id=db_device_id,
            user_id=db_user_id,
            organization_id=db_org_id,
            chat_session_id=connection["chat_session_id"],
        )

    except Exception as e:
        logger.error(f"Validation error: {e}")
        return _fail("VALIDATION_ERROR", "Failed to validate code")


async def mark_connection_active(connection_id: str) -> bool:
    """
    Mark a connection as used and active.

    Called after successful authentication.

    Args:
        connection_id: The connection to mark

    Returns:
        True if successful
    """
    try:
        db = get_db()
        db.update(
            "device_connections",
            data={
                "used": True,
                "is_active": True,
                "last_heartbeat": datetime.utcnow().isoformat(),
            },
            filters={"connection_id": f"eq.{connection_id}"},
        )
        logger.info(f"Marked connection active: {connection_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to mark active: {e}")
        return False


async def mark_connection_inactive(connection_id: str) -> bool:
    """
    Mark a connection as inactive.

    Called on disconnect.

    Args:
        connection_id: The connection to mark

    Returns:
        True if successful
    """
    try:
        db = get_db()
        db.update(
            "device_connections",
            data={
                "is_active": False,
            },
            filters={"connection_id": f"eq.{connection_id}"},
        )
        logger.info(f"Marked connection inactive: {connection_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to mark inactive: {e}")
        return False


async def update_heartbeat(connection_id: str) -> bool:
    """
    Update last heartbeat timestamp.

    Args:
        connection_id: The connection to update

    Returns:
        True if successful
    """
    try:
        db = get_db()
        db.update(
            "device_connections",
            data={"last_heartbeat": datetime.utcnow().isoformat()},
            filters={"connection_id": f"eq.{connection_id}"},
        )
        return True
    except Exception as e:
        logger.error(f"Failed to update heartbeat: {e}")
        return False
