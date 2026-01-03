"""
WebSocket Client - Connects to Windows client devices and sends tool calls
"""

import asyncio
import websockets
import json
import socket
from typing import Optional, Dict, Any
from datetime import datetime
from urllib.parse import urlparse


class WebSocketClient:
    def __init__(self):
        self.connections: Dict[str, websockets.WebSocketServerProtocol] = {}
    
    def _get_local_ips(self) -> list:
        """Get all local IP addresses of this machine"""
        local_ips = ['localhost', '127.0.0.1', '::1', '0.0.0.0']
        try:
            hostname = socket.gethostname()
            # Get all IP addresses for this hostname
            local_ips.extend([ip[4][0] for ip in socket.getaddrinfo(hostname, None)])
            # Also get IPs from gethostbyname_ex
            local_ips.extend(socket.gethostbyname_ex(hostname)[2])
        except:
            pass
        return list(set(local_ips))  # Remove duplicates
    
    def _convert_to_localhost(self, mcp_url: str) -> str:
        """Convert URL to use localhost if it's a local IP address"""
        try:
            parsed = urlparse(mcp_url)
            host = parsed.hostname
            
            if not host:
                return mcp_url
            
            # Check if host is a local IP
            local_ips = self._get_local_ips()
            if host in local_ips:
                # Replace host with localhost
                new_url = mcp_url.replace(f"//{host}:", "//localhost:")
                if new_url != mcp_url:
                    print(f"Converting {mcp_url} to {new_url} (detected same machine)")
                return new_url
        except Exception as e:
            print(f"Error converting URL: {e}")
        
        return mcp_url
    
    async def connect(self, mcp_url: str) -> Optional[websockets.WebSocketClientProtocol]:
        """
        Connect to a device's WebSocket server
        Automatically converts local IP addresses to localhost for same-machine connections
        """
        try:
            # Convert ws:// to ws:// if needed, ensure proper format
            if not mcp_url.startswith("ws://") and not mcp_url.startswith("wss://"):
                mcp_url = f"ws://{mcp_url}"
            
            # Try to convert to localhost if it's a local IP
            original_url = mcp_url
            mcp_url = self._convert_to_localhost(mcp_url)
            
            print(f"Connecting to device at {mcp_url}...")
            
            # Connect with timeout and additional connection parameters
            connection = await asyncio.wait_for(
                websockets.connect(
                    mcp_url,
                    ping_interval=None,  # Disable ping/pong for compatibility
                    close_timeout=10
                ),
                timeout=15.0  # Increased timeout
            )
            
            connection_id = f"{mcp_url}_{int(datetime.now().timestamp())}"
            self.connections[connection_id] = connection
            
            print(f"Connected to device: {mcp_url}")
            return connection
        
        except asyncio.TimeoutError:
            print(f"Connection timeout to {mcp_url}")
            # If localhost conversion failed, try original URL
            if mcp_url != original_url:
                print(f"Retrying with original URL: {original_url}")
                try:
                    connection = await asyncio.wait_for(
                        websockets.connect(original_url, ping_interval=None, close_timeout=10),
                        timeout=15.0
                    )
                    connection_id = f"{original_url}_{int(datetime.now().timestamp())}"
                    self.connections[connection_id] = connection
                    print(f"Connected to device: {original_url}")
                    return connection
                except:
                    pass
            return None
        except Exception as e:
            print(f"Failed to connect to {mcp_url}: {e}")
            # If localhost conversion failed, try original URL
            if mcp_url != original_url:
                print(f"Retrying with original URL: {original_url}")
                try:
                    connection = await asyncio.wait_for(
                        websockets.connect(original_url, ping_interval=None, close_timeout=10),
                        timeout=15.0
                    )
                    connection_id = f"{original_url}_{int(datetime.now().timestamp())}"
                    self.connections[connection_id] = connection
                    print(f"Connected to device: {original_url}")
                    return connection
                except:
                    pass
            return None
    
    async def send_tool_call(
        self,
        connection: websockets.WebSocketClientProtocol,
        tool_name: str,
        arguments: Dict[str, Any],
        role: str = "ai_agent"
    ) -> Dict[str, Any]:
        """
        Send a tool call to the device and wait for result
        """
        try:
            # Generate unique call ID
            call_id = f"call_{int(datetime.now().timestamp())}_{tool_name}"
            
            # Create tool call message
            tool_call = {
                "type": "tool_call",
                "id": call_id,
                "name": tool_name,
                "arguments": arguments,
                "role": role
            }
            
            # Send tool call
            await connection.send(json.dumps(tool_call))
            print(f"Sent tool call: {tool_name} with ID {call_id}")
            
            # Wait for response (with timeout)
            try:
                # Wait for response with timeout
                response_text = await asyncio.wait_for(
                    connection.recv(),
                    timeout=30.0  # 30 second timeout for tool execution
                )
                
                result = json.loads(response_text)
                
                # Verify it's the response for our call
                if result.get("id") == call_id:
                    print(f"Received result for {tool_name}: {result.get('status')}")
                    return result
                else:
                    # Keep waiting for the correct response (up to 3 attempts)
                    attempts = 0
                    while attempts < 3:
                        response_text = await asyncio.wait_for(
                            connection.recv(),
                            timeout=30.0
                        )
                        result = json.loads(response_text)
                        if result.get("id") == call_id:
                            return result
                        attempts += 1
                    
                    # If we didn't get the right response, return error
                    return {
                        "id": call_id,
                        "status": "error",
                        "error": "Did not receive matching response"
                    }
            
            except asyncio.TimeoutError:
                return {
                    "id": call_id,
                    "status": "error",
                    "error": "Tool execution timeout"
                }
        
        except Exception as e:
            print(f"Error sending tool call: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def disconnect(self, connection: websockets.WebSocketClientProtocol):
        """Disconnect from a device"""
        try:
            await connection.close()
            # Remove from connections dict
            for conn_id, conn in list(self.connections.items()):
                if conn == connection:
                    del self.connections[conn_id]
                    break
        except Exception as e:
            print(f"Error disconnecting: {e}")
    
    async def close_all(self):
        """Close all connections"""
        for connection in list(self.connections.values()):
            await self.disconnect(connection)

