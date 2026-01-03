"""
Device Manager - Handles device registration and retrieval
"""

from typing import Optional, Dict
from database import Database


class DeviceManager:
    def __init__(self, db: Database):
        self.db = db
    
    def register_device(
        self,
        device_id: str,
        user_id: str,
        client_id: str,
        device_name: str,
        os_version: str,
        mcp_url: str
    ) -> Dict:
        """Register or update a device"""
        return self.db.create_or_update_device(
            device_id=device_id,
            user_id=user_id,
            client_id=client_id,
            device_name=device_name,
            os_version=os_version,
            mcp_url=mcp_url
        )
    
    def get_user_primary_device(self, user_id: str) -> Optional[Dict]:
        """Get the primary (most recently used) device for a user"""
        devices = self.db.get_user_devices(user_id)
        if devices:
            # Return the most recently seen device
            return self.db.get_device(devices[0]["id"])
        return None









