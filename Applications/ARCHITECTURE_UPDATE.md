# Architecture Update - Client as WebSocket Server

## Corrected Architecture

The Windows MCP Agent now works as a **WebSocket Server** that the backend/LLM connects to, not as a client.

## Flow

### 1. First Launch - Device Registration

1. **Client generates unique MCP URL**
   - Client finds an available port (5000-6000 range)
   - Client gets its local IP address
   - Client generates URL: `ws://{localIP}:{port}/mcp/{deviceId}`
   - Example: `ws://192.168.1.100:5234/mcp/abc123-def456-...`

2. **User enters U & E code**
   - Login window appears
   - User enters Username and Employee Code

3. **Registration with backend**
   - Client sends registration request to backend API:
     ```json
     POST /api/device/register
     {
       "username": "john.doe",
       "employee_code": "EMP12345",
       "device_id": "guid",
       "device_name": "DESKTOP-ABC",
       "os_version": "Windows 10",
       "mcp_url": "ws://192.168.1.100:5234/mcp/abc123..."
     }
     ```
   - Backend stores the MCP URL and associates it with user/client

4. **Client starts WebSocket server**
   - Client starts listening on the generated URL
   - Server waits for incoming connections from backend/LLM

### 2. When User Has an Issue

1. **User requests help** (via backend portal, chat, etc.)

2. **Backend/LLM connects to client's WebSocket server**
   - Backend looks up user's device MCP URL from database
   - Backend connects to: `ws://192.168.1.100:5234/mcp/abc123...`
   - Connection established

3. **Backend/LLM sends tool calls**
   ```json
   {
     "type": "tool_call",
     "id": "call-123",
     "name": "check_cpu_usage",
     "arguments": {},
     "role": "ai_agent"
   }
   ```

4. **Client executes tool**
   - Client receives tool call
   - Validates authorization
   - Executes the tool
   - Returns result:
   ```json
   {
     "type": "tool_result",
     "id": "call-123",
     "status": "success",
     "output": "CPU Usage: 45.2%",
     "executionTimeMs": 120
   }
   ```

5. **Backend/LLM receives result**
   - Backend processes result
   - May send additional tool calls
   - When done, closes connection

## Key Differences from Previous Implementation

| Previous (Wrong) | Current (Correct) |
|------------------|-------------------|
| Client connects to backend | Backend connects to client |
| Client is WebSocket client | Client is WebSocket server |
| Backend generates MCP URL | Client generates MCP URL |
| Client sends URL to backend | Client sends URL to backend (same) |
| Client polls/waits for messages | Client listens for connections |

## Network Considerations

### Firewall
- Client's firewall must allow incoming connections on the selected port
- Application may need to request firewall exception on first run
- Or user must manually configure firewall

### NAT/Network Access
- If client is behind NAT, backend needs to be able to reach the client's IP
- For remote access, may need:
  - VPN connection
  - Port forwarding
  - Or use a relay/proxy server

### Local Network
- Works best when backend and client are on same network
- For internet access, client's public IP and port forwarding may be needed

## Security Considerations

1. **Authentication**: Backend should authenticate when connecting
2. **Authorization**: Each tool call is still validated by role
3. **Network Security**: Consider using WSS (WebSocket Secure) for production
4. **Firewall**: Only allow connections from known backend IPs

## Implementation Details

### McpServer Class
- Uses `HttpListener` to accept WebSocket upgrade requests
- Listens on `http://localhost:{port}/mcp/`
- Accepts WebSocket connections
- Handles incoming tool call messages
- Sends tool results back to connected client

### UrlGenerator Class
- Finds available port (5000-6000)
- Gets local IP address
- Generates unique URL with device ID

### Registration Flow
- Client generates URL before registration
- Sends URL to backend during registration
- Backend stores URL for later use
- Client starts server after successful registration









