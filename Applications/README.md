# Windows MCP Agent

A secure, role-aware Windows desktop application that listens for MCP (Model Context Protocol) tool calls and executes approved system tools to resolve user issues.

## Features

- **System Tray Application**: Runs persistently in the system tray
- **MCP Protocol Support**: Secure WebSocket (WSS) communication
- **Role-Based Access Control**: Three roles (AI_AGENT, HUMAN_AGENT, ADMIN) with hierarchical permissions
- **Tool Authorization Engine**: Policy-based tool execution with risk assessment
- **Enterprise-Grade Security**: JWT authentication, device registration, audit logging

## Technology Stack

- **.NET 8 LTS**: Windows desktop application framework
- **WPF**: User interface framework
- **WebSocket**: MCP protocol transport
- **JWT**: Authentication and authorization

## Project Structure

```
WindowsMcpAgent/
├── src/
│   ├── WindowsMcpAgent/          # WPF application
│   └── WindowsMcpAgent.Core/     # Core business logic
├── Project_requirements.md        # Detailed requirements
└── README.md                      # This file
```

## Configuration

The application can be configured via `appsettings.json` or environment variables:

**Backend API URL:**
- Default: `http://localhost:9000`
- Environment variable: `MCP_BACKEND_API_URL`
- Config file: `BackendSettings.ApiUrl`

**JWT Secret:**
- Default: `default-secret-key-change-in-production`
- Environment variable: `MCP_JWT_SECRET`

## Building

```bash
dotnet build WindowsMcpAgent.sln
```

## Running

```bash
dotnet run --project src/WindowsMcpAgent/WindowsMcpAgent.csproj
```

## Configuration

1. Copy `appsettings.json.example` to `appsettings.json` in the `src/WindowsMcpAgent` directory
2. Update the `WssUrl` and `JwtSecret` values
3. The application will read these settings on startup

Alternatively, set environment variables:
- `MCP_WSS_URL`: WebSocket Secure URL for MCP server
- `MCP_JWT_SECRET`: Secret key for JWT validation

## Roles & Permissions

### AI_AGENT
- **SAFE Tools**: Auto-approved read-only operations
  - `check_cpu_usage` - Check CPU utilization
  - `check_memory_usage` - Check memory usage
  - `check_disk_usage` - Check disk space
  - `check_system_uptime` - Check system uptime
  - `check_event_logs_summary` - Summary of event logs
  - `check_network_status` - Check network interface status

- **CAUTION Tools**: Temporary disruption operations
  - `flush_dns_cache` - Flush DNS cache
  - `renew_ip_address` - Renew IP address
  - `reset_network_stack` - Reset network stack
  - `restart_whitelisted_service` - Restart whitelisted services
  - `clear_windows_temp` - Clear Windows temp files
  - `clear_user_temp` - Clear user temp files

### HUMAN_AGENT
- All AI_AGENT tools plus:
  - `restart_any_service` - Restart any whitelisted service
  - `restart_application` - Restart an application by process name
  - `network_adapter_reset` - Reset network adapter
  - `windows_update_repair` - Repair Windows Update components

### ADMIN
- All lower role tools plus:
  - `registry_fix` - Fix registry issues (whitelisted keys only)
  - `firewall_rule_repair` - Repair firewall rules

## Security

- **TLS (WSS)**: All communications encrypted
- **JWT Authentication**: Role-based token validation
- **Device Registration**: Unique device ID per installation
- **Tool Whitelisting**: Only approved tools can be executed
- **Role-Based Access Control**: Hierarchical permission system
- **Audit Logging**: All tool executions and authorization decisions logged
- **Execution Timeouts**: Prevents hanging operations
- **No Data Exfiltration**: Explicitly forbidden operations

## Audit Logs

Audit logs are stored in:
```
%LOCALAPPDATA%\WindowsMcpAgent\Logs\
```

Log files:
- `audit_YYYYMMDD.log` - Tool execution logs
- `authorization_YYYYMMDD.log` - Authorization decisions
- `connection_YYYYMMDD.log` - Connection events

## License

Enterprise IT Support Tool

