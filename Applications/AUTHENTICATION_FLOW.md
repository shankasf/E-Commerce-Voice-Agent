# Authentication Flow Documentation

## Overview

The Windows MCP Agent implements a device registration and authentication flow that supports:
- **Multiple Organizations (Clients)**: Each organization has its own backend
- **Multiple Users**: Each organization can have multiple users
- **Multiple Devices**: Each user can have multiple computers/devices
- **Unique MCP URLs**: Each device gets a unique WebSocket URL for tool calls

## First Launch Flow

1. **Application Starts**
   - Application checks if device is registered by looking for `auth.json` in `%LOCALAPPDATA%\WindowsMcpAgent\`

2. **If Not Registered**
   - **Client generates unique MCP WebSocket URL**:
     - Finds an available port (5000-6000 range)
     - Gets local IP address
     - Generates URL: `ws://{localIP}:{port}/mcp/{deviceId}`
     - Example: `ws://192.168.1.100:5234/mcp/abc123-def456-...`
   
   - Login window appears prompting for:
     - **Username**: User's username in the organization
     - **Employee Code**: Employee/User identification code
   - Device information is automatically collected:
     - Device ID (unique GUID)
     - Device Name (computer name)
     - OS Version

3. **Registration Request**
   - Application sends registration request to backend API with **client-generated MCP URL**:
     ```
     POST /api/device/register
     {
       "username": "john.doe",
       "employee_code": "EMP12345",
       "device_id": "guid-here",
       "device_name": "DESKTOP-ABC123",
       "os_version": "Microsoft Windows NT 10.0.26100.0",
       "mcp_url": "ws://192.168.1.100:5234/mcp/abc123-def456-..."
     }
     ```

4. **Backend Response**
   - Backend validates credentials
   - Backend stores the client-generated MCP URL
   - Associates device with user and organization (client)
   - Returns:
     ```json
     {
       "success": true,
       "jwt_token": "eyJhbGc...",
       "client_id": "client123",
       "user_id": "user456"
     }
     ```

5. **Local Storage**
   - Authentication data is saved to `%LOCALAPPDATA%\WindowsMcpAgent\auth.json`
   - Contains:
     - Username and Employee Code
     - Device ID
     - **Client-generated MCP URL** (stored locally)
     - JWT Token (if provided)
     - Client ID and User ID

6. **WebSocket Server Starts**
   - Application starts a **WebSocket server** listening on the generated URL
   - Server waits for incoming connections from backend/LLM
   - When user has an issue, backend connects to this URL and sends tool calls

## Subsequent Launches

1. **Application Starts**
   - Checks for `auth.json` file
   - If found, loads authentication data
   - Extracts port from stored MCP URL
   - Starts WebSocket server on the same URL
   - Server listens for incoming connections from backend/LLM
   - No login required

## Multi-Tenant Architecture

```
Organization A (Client ID: client-001)
├── User 1 (User ID: user-001)
│   ├── Device 1 → MCP URL: wss://.../clients/client-001/users/user-001/devices/device-001
│   └── Device 2 → MCP URL: wss://.../clients/client-001/users/user-001/devices/device-002
└── User 2 (User ID: user-002)
    └── Device 1 → MCP URL: wss://.../clients/client-001/users/user-002/devices/device-003

Organization B (Client ID: client-002)
└── User 1 (User ID: user-003)
    └── Device 1 → MCP URL: wss://.../clients/client-002/users/user-003/devices/device-004
```

## Backend API Requirements

### Device Registration Endpoint

**Endpoint**: `POST /api/device/register`

**Request Body**:
```json
{
  "username": "string",
  "employee_code": "string",
  "device_id": "string (GUID)",
  "device_name": "string",
  "os_version": "string"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "mcp_url": "wss://mcp-server.com/path/to/unique/endpoint",
  "jwt_token": "optional-jwt-token",
  "client_id": "organization-id",
  "user_id": "user-id",
  "message": "Device registered successfully"
}
```

**Error Response** (400/401/500):
```json
{
  "success": false,
  "error": "Error message here",
  "message": "Detailed error description"
}
```

### Backend Responsibilities

1. **Validate Credentials**
   - Verify username and employee code exist
   - Check if user belongs to an organization (client)

2. **Device Management**
   - Create or update device record
   - Associate device with user and client
   - Generate or retrieve unique MCP WebSocket endpoint

3. **MCP URL Storage**
   - Backend receives client-generated MCP URL during registration
   - Format: `ws://{clientIP}:{port}/mcp/{deviceId}`
   - Backend stores this URL for later use

4. **Tool Call Routing**
   - When a user requests help, backend looks up the user's device MCP URL
   - Backend connects to the client's WebSocket server
   - Backend sends tool calls over the WebSocket connection
   - Client executes tools and returns results

## Security Considerations

1. **JWT Tokens**: Optional but recommended for additional security
2. **HTTPS/WSS**: All communications must use secure protocols
3. **Device ID**: Unique per installation, stored locally
4. **Credential Storage**: Username and employee code stored locally (consider encryption for production)

## Re-registration

If device needs to be re-registered:
1. Delete `%LOCALAPPDATA%\WindowsMcpAgent\auth.json`
2. Restart application
3. Login window will appear again

## Configuration

Backend API URL can be configured via:
1. `appsettings.json`: `BackendSettings.ApiUrl`
2. Environment variable: `MCP_BACKEND_API_URL`
3. Default: `https://api.your-backend.com`

## Example Backend Implementation (Pseudo-code)

```python
@app.post("/api/device/register")
async def register_device(request: DeviceRegistrationRequest):
    # Validate user credentials
    user = validate_user(request.username, request.employee_code)
    if not user:
        return {"success": False, "error": "Invalid credentials"}
    
    # Get or create device
    device = get_or_create_device(
        device_id=request.device_id,
        user_id=user.id,
        client_id=user.client_id,
        device_name=request.device_name,
        os_version=request.os_version,
        mcp_url=request.mcp_url  # Store client-generated URL
    )
    
    # Store the client-generated MCP URL for later use
    # When user needs help, backend will connect to this URL
    
    # Generate JWT token (optional)
    jwt_token = generate_jwt_token(user, device)
    
    return {
        "success": True,
        "jwt_token": jwt_token,
        "client_id": user.client_id,
        "user_id": user.id
    }
```

