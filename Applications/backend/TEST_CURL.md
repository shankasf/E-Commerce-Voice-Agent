# CURL Test Commands

## Prerequisites

1. Backend must be running on `http://localhost:9000`
2. Windows MCP Agent must be running and registered
3. `.env` file must have `TEST_EMAIL` and `TEST_UE_CODE` set

## 1. Health Check

```bash
curl http://localhost:9000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-12-23T..."
}
```

## 2. Register Device

First, register a device (Windows client will do this automatically, but you can test manually):

```bash
curl -X POST http://localhost:9000/api/device/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test@example.com\",
    \"ue_code\": \"TEST123\",
    \"device_id\": \"test-device-001\",
    \"device_name\": \"TEST-PC\",
    \"os_version\": \"Windows 10\",
    \"mcp_url\": \"ws://192.168.1.100:5234/mcp/test-device-001\"
  }"
```

**Note**: Replace `test@example.com` and `TEST123` with values from your `.env` file.
Replace `ws://192.168.1.100:5234/mcp/test-device-001` with the actual MCP URL from your Windows client.

Expected response:
```json
{
  "success": true,
  "jwt_token": "token_...",
  "client_id": "client_default",
  "user_id": "user_1234567890",
  "message": "Device registered successfully"
}
```

## 3. Get User Devices

After registration, get the user_id from the response above, then:

```bash
curl http://localhost:9000/api/user/{user_id}/devices
```

Replace `{user_id}` with the actual user_id from registration response.

## 4. Solve Problem: List Network Configurations

This will connect to the Windows client and execute network diagnostic tools:

```bash
curl -X POST http://localhost:9000/api/problem/solve \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"user_1234567890\",
    \"problem_description\": \"I need to list and check my network configurations and interface status\"
  }"
```

**Note**: Replace `user_1234567890` with your actual user_id from registration.

Expected response:
```json
{
  "success": true,
  "solution": "Network configuration check completed...",
  "tools_executed": [
    {
      "tool": "check_network_status",
      "arguments": {},
      "result": {
        "status": "success",
        "output": "Ethernet (Realtek): Up, Speed: 1000 Mbps\nWi-Fi (Intel): Up, Speed: 300 Mbps",
        "executionTimeMs": 150
      }
    }
  ]
}
```

## 5. Alternative: More Specific Network Problem

```bash
curl -X POST http://localhost:9000/api/problem/solve \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"user_1234567890\",
    \"problem_description\": \"Show me all network interfaces, their status, IP addresses, and connection speeds\"
  }"
```

## 6. Test with Different Network Issues

### Check network connectivity:
```bash
curl -X POST http://localhost:9000/api/problem/solve \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"user_1234567890\",
    \"problem_description\": \"I'm having network connectivity issues. Please check my network configuration and status\"
  }"
```

### Fix network problems:
```bash
curl -X POST http://localhost:9000/api/problem/solve \
  -H "Content-Type: application/json" \
  -d "{
    \"user_id\": \"user_1234567890\",
    \"problem_description\": \"My internet connection is slow. Please diagnose and fix network issues\"
  }"
```

## Windows PowerShell Alternative

If you prefer PowerShell:

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:9000/api/health" -Method Get

# Register device
$body = @{
    email = "test@example.com"
    ue_code = "TEST123"
    device_id = "test-device-001"
    device_name = "TEST-PC"
    os_version = "Windows 10"
    mcp_url = "ws://192.168.1.100:5234/mcp/test-device-001"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9000/api/device/register" -Method Post -Body $body -ContentType "application/json"

# Solve network problem
$problemBody = @{
    user_id = "user_1234567890"
    problem_description = "I need to list and check my network configurations and interface status"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9000/api/problem/solve" -Method Post -Body $problemBody -ContentType "application/json"
```

## Testing Flow

1. **Start Backend**: `python start.py` (in backend directory)
2. **Start Windows Client**: Run the Windows MCP Agent application
3. **Register Device**: Windows client will auto-register, or use curl command #2
4. **Get User ID**: From registration response or check JSON database file
5. **Test Problem Solving**: Use curl command #4 to test network configuration listing

## Troubleshooting

### Error: "No device found for user"
- Make sure device is registered first
- Check that user_id matches the one from registration

### Error: "Failed to connect to device"
- Ensure Windows MCP Agent is running
- Check that MCP URL in database matches the actual client URL
- Verify firewall allows connections on the MCP port

### Error: "Invalid email or U & E code"
- Check `.env` file has correct `TEST_EMAIL` and `TEST_UE_CODE`
- Ensure registration request uses exact same values









