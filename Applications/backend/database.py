"""
Database module using JSON file storage (for testing)
"""

import json
import os
from typing import Optional, Dict, List
from datetime import datetime

# Try to import fcntl for file locking on Unix systems
try:
    import fcntl
    HAS_FCNTL = True
except ImportError:
    HAS_FCNTL = False


class Database:
    def __init__(self, db_path: str = "mcp_agent_data.json"):
        self.db_path = db_path
        self.data = self._load_data()
    
    def _load_data(self) -> Dict:
        """Load data from JSON file"""
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, 'r', encoding='utf-8') as f:
                    # Try to acquire read lock on Unix systems
                    if HAS_FCNTL:
                        try:
                            fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                            data = json.load(f)
                            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                            return data
                        except (IOError, OSError):
                            # Locking failed, try without lock
                            f.seek(0)  # Reset file pointer
                            return json.load(f)
                    else:
                        # Windows or system without fcntl - read directly
                        return json.load(f)
            except (json.JSONDecodeError, IOError, OSError) as e:
                print(f"Warning: Failed to load database file: {e}")
        
        # Return default structure
        return {
            "clients": {},
            "users": {},
            "devices": {}
        }
    
    def _save_data(self):
        """
        Save data to JSON file using atomic write (temp file + rename) to prevent corruption.
        This ensures that if the process crashes during write, the original file remains intact.
        """
        temp_path = f"{self.db_path}.tmp"
        try:
            # Write to temporary file first
            with open(temp_path, 'w', encoding='utf-8') as f:
                # Try to acquire exclusive lock on Unix systems
                if HAS_FCNTL:
                    try:
                        fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                        json.dump(self.data, f, indent=2, ensure_ascii=False)
                        f.flush()
                        os.fsync(f.fileno())  # Force write to disk
                        fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                    except (IOError, OSError):
                        # Locking failed, try without lock
                        f.seek(0)
                        json.dump(self.data, f, indent=2, ensure_ascii=False)
                        f.flush()
                        os.fsync(f.fileno())
                else:
                    # Windows or system without fcntl - write directly
                    json.dump(self.data, f, indent=2, ensure_ascii=False)
                    f.flush()
                    os.fsync(f.fileno())
            
            # Atomic replace: rename temp file to actual file
            # This is atomic on most filesystems (ensures either old or new file exists, never corrupted)
            if os.path.exists(self.db_path):
                os.replace(temp_path, self.db_path)
            else:
                os.rename(temp_path, self.db_path)
        except Exception as e:
            print(f"Error saving database file: {e}")
            # Clean up temp file if it exists
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except:
                    pass
            raise
    
    def initialize(self):
        """Initialize database (no-op for JSON)"""
        # Ensure default structure exists
        if "clients" not in self.data:
            self.data["clients"] = {}
        if "users" not in self.data:
            self.data["users"] = {}
        if "devices" not in self.data:
            self.data["devices"] = {}
        
        # Create default client if none exists
        if not self.data["clients"]:
            self.data["clients"]["client_default"] = {
                "id": "client_default",
                "name": "Default Organization",
                "created_at": datetime.now().isoformat()
            }
            self._save_data()
    
    def is_connected(self) -> bool:
        """Check if database is connected (always true for JSON)"""
        return True
    
    def get_user_by_email_and_ue_code(self, email: str, ue_code: str) -> Optional[Dict]:
        """
        Get user by email and U&E code.
        Reloads data to ensure we have the latest state.
        """
        # Reload data to get latest state (important for concurrent operations)
        self.data = self._load_data()
        
        # Ensure users dictionary exists
        if "users" not in self.data:
            return None
        
        for user_id, user in self.data["users"].items():
            if user.get("email") == email and user.get("ue_code") == ue_code:
                return {
                    "id": user_id,
                    "client_id": user.get("client_id", "client_default"),
                    "email": user["email"],
                    "ue_code": user["ue_code"]
                }
        return None
    
    def create_user(self, email: str, ue_code: str, client_id: str = "client_default") -> Dict:
        """
        Create a new user.
        Note: This method assumes get_user_by_email_and_ue_code was already called
        (which reloads data). We reload again here to ensure we have the absolute latest state.
        """
        # Reload data to get latest state (important for concurrent updates)
        # This ensures we have the latest data even if get_user_by_email_and_ue_code was called earlier
        self.data = self._load_data()
        
        # Double-check if user already exists (defensive programming for concurrent requests)
        if "users" in self.data:
            for user_id, user in self.data["users"].items():
                if user.get("email") == email and user.get("ue_code") == ue_code:
                    # User already exists, return it
                    return {
                        "id": user_id,
                        "client_id": user.get("client_id", client_id),
                        "email": user["email"],
                        "ue_code": user["ue_code"]
                    }
        
        # Create new user
        user_id = f"user_{int(datetime.now().timestamp())}"
        user = {
            "id": user_id,
            "client_id": client_id,
            "email": email,
            "ue_code": ue_code,
            "created_at": datetime.now().isoformat()
        }
        
        # Ensure users dictionary exists
        if "users" not in self.data:
            self.data["users"] = {}
        
        self.data["users"][user_id] = user
        self._save_data()
        
        return user
    
    def get_device(self, device_id: str) -> Optional[Dict]:
        """
        Get device by ID.
        Reloads data to ensure we have the latest state.
        """
        # Reload data to get latest state
        self.data = self._load_data()
        
        device = self.data["devices"].get(device_id)
        if device:
            return {
                "id": device["id"],
                "user_id": device["user_id"],
                "client_id": device["client_id"],
                "device_name": device["device_name"],
                "os_version": device.get("os_version", ""),
                "mcp_url": device["mcp_url"],
                "registered_at": device.get("registered_at", ""),
                "last_seen": device.get("last_seen", "")
            }
        return None
    
    def create_or_update_device(
        self,
        device_id: str,
        user_id: str,
        client_id: str,
        device_name: str,
        os_version: str,
        mcp_url: str
    ) -> Dict:
        """
        Create or update device registration.
        - If device exists, preserve registered_at and update other fields
        - If device is new, set registered_at to current time
        - Always update last_seen to current time
        """
        # Reload data to get latest state (important for concurrent updates)
        self.data = self._load_data()
        
        # Check if device already exists
        existing_device = self.data["devices"].get(device_id)
        
        if existing_device:
            # Update existing device - preserve registered_at
            device = {
                "id": device_id,
                "user_id": user_id,  # Allow user_id to be updated if device is reassigned
                "client_id": client_id,
                "device_name": device_name,
                "os_version": os_version,
                "mcp_url": mcp_url,
                "registered_at": existing_device.get("registered_at", datetime.now().isoformat()),  # Preserve original registration time
                "last_seen": datetime.now().isoformat()  # Always update last_seen
            }
        else:
            # Create new device
            device = {
                "id": device_id,
                "user_id": user_id,
                "client_id": client_id,
                "device_name": device_name,
                "os_version": os_version,
                "mcp_url": mcp_url,
                "registered_at": datetime.now().isoformat(),  # Set registration time for new device
                "last_seen": datetime.now().isoformat()
            }
        
        # Ensure devices dictionary exists
        if "devices" not in self.data:
            self.data["devices"] = {}
        
        # Update the device in memory
        self.data["devices"][device_id] = device
        
        # Save to file
        self._save_data()
        
        return device
    
    def get_user_devices(self, user_id: str) -> List[Dict]:
        """
        Get all devices for a user.
        Reloads data to ensure we have the latest state.
        """
        # Reload data to get latest state
        self.data = self._load_data()
        
        devices = []
        if "devices" in self.data:
            for device_id, device in self.data["devices"].items():
                if device.get("user_id") == user_id:
                    devices.append({
                        "id": device["id"],
                        "device_name": device["device_name"],
                        "os_version": device.get("os_version", ""),
                        "mcp_url": device["mcp_url"],
                        "registered_at": device.get("registered_at", ""),
                        "last_seen": device.get("last_seen", "")
                    })
        
        # Sort by registered_at descending
        devices.sort(key=lambda x: x.get("registered_at", ""), reverse=True)
        return devices
