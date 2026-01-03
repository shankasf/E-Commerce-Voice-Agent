# Reverse Connection Architecture Implementation

## Overview
The Windows MCP Agent now uses a **reverse connection** architecture where:
- Windows app connects to backend as a WebSocket client (outbound connection)
- Backend maintains a registry of active device connections
- When user submits a problem, backend uses existing connection to send tool calls
- No firewall/NAT issues since connection is initiated from device

## Backend Changes

### New Files
1. **`backend/connection_registry.py`** - Manages active WebSocket connections
2. **`backend/message_queue.py`** - Handles async message passing for tool call/result matching

### Updated Files
1. **`backend/main.py`**:
   - Added WebSocket endpoint `/ws/device/{device_id}` for devices to connect
   - Updated `solve_problem` to use connection registry instead of connecting
   - Made `mcp_url` optional in device registration
   - Added message queue for tool result handling

## Windows App Changes Needed

### 1. Replace McpServer with McpClient
- Change `_mcpServer` to `_mcpClient` in `MainWindow.xaml.cs`
- Remove server startup code
- Add client connection code

### 2. Update Registration
- Make `mcp_url` optional in registration request
- Get backend WebSocket URL from registration response or construct it
- Store backend URL instead of MCP URL

### 3. Update InitializeCoreComponents
- Connect to backend WebSocket instead of starting server
- Use `McpClient.ConnectAsync()` with backend URL
- Handle tool calls received from backend

## Testing
1. Start backend server
2. Register device (mcp_url is optional)
3. Device connects to backend WebSocket endpoint
4. Submit problem via frontend
5. Backend uses existing connection to send tool calls
6. Device executes tools and sends results back

## All AI_AGENT Tools Available
For testing, all tools with `MinRole = Role.AI_AGENT` are available:
- check_cpu_usage
- check_memory_usage
- check_disk_usage
- check_system_uptime
- check_event_logs_summary
- check_network_status
- flush_dns_cache
- renew_ip_address
- reset_network_stack
- restart_whitelisted_service
- clear_windows_temp
- clear_user_temp


