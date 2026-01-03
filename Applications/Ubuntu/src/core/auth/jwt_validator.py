"""
JWT token validation service.
"""
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from ..models import Role


class JwtValidator:
    """Validates JWT tokens and extracts claims."""

    def __init__(self, secret: str, algorithm: str = "HS256"):
        """
        Initialize JWT validator.

        Args:
            secret: Secret key for JWT validation
            algorithm: JWT algorithm (default: HS256)
        """
        self.secret = secret
        self.algorithm = algorithm

    def validate_token(self, token: str, expected_device_id: Optional[str] = None) -> bool:
        """
        Validate a JWT token.

        Args:
            token: JWT token string
            expected_device_id: Expected device ID claim

        Returns:
            True if token is valid
        """
        try:
            payload = jwt.decode(
                token,
                self.secret,
                algorithms=[self.algorithm],
            )

            # Check expiration
            if "exp" in payload:
                exp_timestamp = payload["exp"]
                if datetime.utcfromtimestamp(exp_timestamp) < datetime.utcnow():
                    return False

            # Check device ID if provided
            if expected_device_id:
                token_device_id = payload.get("device_id")
                if token_device_id != expected_device_id:
                    return False

            return True

        except jwt.ExpiredSignatureError:
            return False
        except jwt.InvalidTokenError:
            return False
        except Exception as e:
            print(f"Error validating token: {e}")
            return False

    def extract_role(self, token: str) -> Role:
        """
        Extract role from JWT token.

        Args:
            token: JWT token string

        Returns:
            Role enum value
        """
        try:
            payload = jwt.decode(
                token,
                self.secret,
                algorithms=[self.algorithm],
                options={"verify_signature": False},  # Just extracting, validation done separately
            )

            role_str = payload.get("role", "ai_agent")
            return Role.from_string(role_str)

        except Exception as e:
            print(f"Error extracting role: {e}")
            return Role.AI_AGENT

    def extract_claims(self, token: str) -> Dict[str, Any]:
        """
        Extract all claims from JWT token.

        Args:
            token: JWT token string

        Returns:
            Dictionary of claims
        """
        try:
            payload = jwt.decode(
                token,
                self.secret,
                algorithms=[self.algorithm],
                options={"verify_signature": False},
            )
            return payload
        except Exception as e:
            print(f"Error extracting claims: {e}")
            return {}

    def generate_token(self, device_id: str, role: Role,
                      expiration_days: int = 365) -> str:
        """
        Generate a JWT token (for testing purposes).

        Args:
            device_id: Device ID
            role: User role
            expiration_days: Token expiration in days

        Returns:
            JWT token string
        """
        payload = {
            "device_id": device_id,
            "role": role.name.lower(),
            "exp": datetime.utcnow() + timedelta(days=expiration_days),
            "iat": datetime.utcnow(),
        }

        return jwt.encode(payload, self.secret, algorithm=self.algorithm)
