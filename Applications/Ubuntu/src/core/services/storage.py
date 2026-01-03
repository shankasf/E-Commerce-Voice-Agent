"""
Local storage service for persisting configuration and authentication data.
"""
import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
import uuid


class SecureStorage:
    """Manages local file-based storage for configuration and authentication."""

    def __init__(self, config_dir: str = "~/.config/ubuntu-mcp-agent", jwt_secret: Optional[str] = None):
        """
        Initialize local storage.

        Args:
            config_dir: Directory for configuration files
            jwt_secret: JWT secret for token validation (optional)
        """
        self.config_dir = Path(config_dir).expanduser()
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.jwt_secret = jwt_secret

        self.auth_file = self.config_dir / "auth.json"
        self.config_file = self.config_dir / "config.json"
        self.device_id_file = self.config_dir / "device.id"

    def save_auth_data(self, email: str, token: str, device_id: str,
                      client_id: str, user_id: str) -> None:
        """
        Save authentication data.

        Args:
            email: User email
            token: JWT token
            device_id: Device ID
            client_id: Client/organization ID
            user_id: User ID
        """
        auth_data = {
            "email": email,
            "token": token,
            "device_id": device_id,
            "client_id": client_id,
            "user_id": user_id,
        }

        with open(self.auth_file, "w") as f:
            json.dump(auth_data, f, indent=2)

        # Set restrictive permissions (owner read/write only)
        os.chmod(self.auth_file, 0o600)

    def load_auth_data(self) -> Optional[Dict[str, str]]:
        """
        Load authentication data.

        Returns:
            Dictionary with auth data or None if not found
        """
        if not self.auth_file.exists():
            return None

        try:
            with open(self.auth_file, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading auth data: {e}")
            return None

    def load_credentials(self) -> Optional[Dict[str, str]]:
        """
        Load credentials (alias for load_auth_data).

        Returns:
            Dictionary with credentials or None if not found
        """
        return self.load_auth_data()

    def clear_auth_data(self) -> None:
        """Clear authentication data (logout)."""
        if self.auth_file.exists():
            self.auth_file.unlink()

    def is_registered(self) -> bool:
        """Check if device is registered."""
        return self.auth_file.exists()

    def get_or_create_device_id(self) -> str:
        """
        Get existing device ID or create a new one.

        Returns:
            Device ID (UUID)
        """
        if self.device_id_file.exists():
            try:
                with open(self.device_id_file, "r") as f:
                    device_id = f.read().strip()
                    if device_id:
                        return device_id
            except IOError:
                pass

        # Create new device ID
        device_id = str(uuid.uuid4())
        with open(self.device_id_file, "w") as f:
            f.write(device_id)

        os.chmod(self.device_id_file, 0o600)
        return device_id

    def save_config(self, config: Dict[str, Any]) -> None:
        """
        Save configuration.

        Args:
            config: Configuration dictionary
        """
        with open(self.config_file, "w") as f:
            json.dump(config, f, indent=2)

        os.chmod(self.config_file, 0o644)

    def load_config(self) -> Optional[Dict[str, Any]]:
        """
        Load configuration.

        Returns:
            Configuration dictionary or None if not found
        """
        if not self.config_file.exists():
            return None

        try:
            with open(self.config_file, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading config: {e}")
            return None

    def get_token(self) -> Optional[str]:
        """Get stored JWT token."""
        auth_data = self.load_auth_data()
        return auth_data.get("token") if auth_data else None

    def get_device_id_from_auth(self) -> Optional[str]:
        """Get device ID from auth data."""
        auth_data = self.load_auth_data()
        return auth_data.get("device_id") if auth_data else None

    def get_user_info(self) -> Optional[Dict[str, str]]:
        """Get user information."""
        auth_data = self.load_auth_data()
        if not auth_data:
            return None

        return {
            "email": auth_data.get("email", ""),
            "device_id": auth_data.get("device_id", ""),
            "client_id": auth_data.get("client_id", ""),
            "user_id": auth_data.get("user_id", ""),
        }
