"""
Connection Registry - Manages active WebSocket connections from Windows devices
"""

from typing import Dict, Optional, Any
from datetime import datetime
import asyncio


class ConnectionRegistry:
    """
    Registry that tracks active WebSocket connections from Windows devices.
    Maps device_id -> websocket connection (FastAPI WebSocket or websockets library)
    """
    
    def __init__(self):
        self._connections: Dict[str, Any] = {}  # device_id -> WebSocket connection
        self._device_info: Dict[str, dict] = {}  # device_id -> {user_id, device_name, connected_at}
        self._lock = asyncio.Lock()
    
    async def register_connection(
        self, 
        device_id: str, 
        connection: Any,  # FastAPI WebSocket or websockets.WebSocketServerProtocol
        user_id: Optional[str] = None,
        device_name: Optional[str] = None
    ):
        """Register a new device connection"""
        async with self._lock:
            # Close existing connection if any
            if device_id in self._connections:
                try:
                    old_conn = self._connections[device_id]
                    if hasattr(old_conn, 'close'):
                        await old_conn.close()
                except:
                    pass
            
            self._connections[device_id] = connection
            self._device_info[device_id] = {
                "user_id": user_id,
                "device_name": device_name,
                "connected_at": datetime.now().isoformat()
            }
            print(f"Device {device_id} ({device_name}) connected. Total active connections: {len(self._connections)}")
    
    async def unregister_connection(self, device_id: str):
        """Unregister a device connection"""
        async with self._lock:
            if device_id in self._connections:
                del self._connections[device_id]
            if device_id in self._device_info:
                del self._device_info[device_id]
            print(f"Device {device_id} disconnected. Total active connections: {len(self._connections)}")
    
    def get_connection(self, device_id: str) -> Optional[Any]:
        """Get connection for a device"""
        return self._connections.get(device_id)
    
    def is_connected(self, device_id: str) -> bool:
        """Check if device is connected"""
        connection = self._connections.get(device_id)
        if connection is None:
            return False
        # Check if connection is still open
        # FastAPI WebSocket uses client_state, websockets uses open
        if hasattr(connection, 'client_state'):
            return connection.client_state.value == 1  # WebSocketState.CONNECTED
        elif hasattr(connection, 'open'):
            return connection.open
        return True  # Assume connected if we can't check
    
    def get_all_connections(self) -> Dict[str, Any]:
        """Get all active connections"""
        return self._connections.copy()
    
    def get_device_info(self, device_id: str) -> Optional[dict]:
        """Get device information"""
        return self._device_info.get(device_id)
    
    async def send_to_device(
        self, 
        device_id: str, 
        message: dict
    ) -> bool:
        """
        Send a message to a device
        Returns True if sent successfully, False otherwise
        """
        connection = self.get_connection(device_id)
        if not connection:
            return False
        
        if not self.is_connected(device_id):
            await self.unregister_connection(device_id)
            return False
        
        try:
            import json
            message_json = json.dumps(message)
            
            # FastAPI WebSocket uses send_text
            if hasattr(connection, 'send_text'):
                await connection.send_text(message_json)
            # websockets library uses send
            elif hasattr(connection, 'send'):
                await connection.send(message_json)
            else:
                print(f"Unknown connection type for device {device_id}")
                return False
                
            return True
        except Exception as e:
            print(f"Error sending message to device {device_id}: {e}")
            await self.unregister_connection(device_id)
            return False
    
    async def close_all(self):
        """Close all connections"""
        async with self._lock:
            for device_id, connection in list(self._connections.items()):
                try:
                    await connection.close()
                except:
                    pass
            self._connections.clear()
            self._device_info.clear()

