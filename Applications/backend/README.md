# Windows MCP Agent Backend

Python backend for the Windows MCP Agent system. Handles device registration, LLM-powered problem analysis, and tool execution on Windows clients.

## Features

- **Device Registration**: Registers Windows clients with their generated MCP WebSocket URLs
- **LLM Integration**: Uses OpenAI (or compatible) API to analyze problems and plan tool execution
- **WebSocket Client**: Connects to Windows client devices to execute tools
- **SQLite Database**: Stores user, device, and client information
- **REST API**: FastAPI-based endpoints for registration and problem solving

## Setup

1. **Install dependencies**:
```bash
pip install -r requirements.txt
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

3. **Run the backend**:
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --host 0.0.0.0 --port 9000
```

## API Endpoints

### Device Registration
```
POST /api/device/register
```

Request:
```json
{
  "email": "user@example.com",
  "ue_code": "U&E12345",
  "device_id": "guid-here",
  "device_name": "DESKTOP-ABC",
  "os_version": "Windows 10",
  "mcp_url": "ws://192.168.1.100:5234/mcp/device-id"
}
```

Response:
```json
{
  "success": true,
  "jwt_token": "token_...",
  "client_id": "client_default",
  "user_id": "user_123"
}
```

### Solve Problem
```
POST /api/problem/solve
```

Request:
```json
{
  "user_id": "user_123",
  "problem_description": "My computer is running slow",
  "device_id": "optional-device-id"
}
```

Response:
```json
{
  "success": true,
  "solution": "Problem resolved by checking CPU and memory...",
  "tools_executed": [
    {
      "tool": "check_cpu_usage",
      "result": {"status": "success", "output": "CPU Usage: 45%"}
    }
  ]
}
```

## Database

The backend uses JSON file storage (for testing) to store:
- **Clients**: Organizations
- **Users**: Users with email and U&E code
- **Devices**: Registered Windows devices with MCP URLs

Database file: `mcp_agent_data.json` (created automatically)

**Authentication**: Credentials are validated against `.env` file:
- `TEST_EMAIL`: Email for authentication
- `TEST_UE_CODE`: U&E code for authentication

Users must match these exact credentials to register devices.

## LLM Configuration

The backend uses OpenAI API by default. To use a different provider:

1. Set `OPENAI_API_KEY` in `.env`
2. Set `OPENAI_MODEL` (default: `gpt-4`)
3. Modify `llm_service.py` to use a different API if needed

**Note**: If no API key is provided, the backend runs in mock mode with basic tool selection logic.

## Creating Test Users

You can create test users directly in the database or add an endpoint. For testing, you can manually insert:

```python
from database import Database
db = Database()
db.initialize()
user = db.create_user("test@example.com", "TEST123", "client_default")
```

## Architecture

1. **User reports problem** → Backend receives problem description
2. **LLM analyzes** → Generates tool execution plan
3. **Backend connects** → Connects to user's device WebSocket server
4. **Tools executed** → Sends tool calls, receives results
5. **LLM summarizes** → Generates solution summary
6. **Response sent** → Returns solution to user

## Development

- **Database**: SQLite (can be upgraded to PostgreSQL/MySQL)
- **API Framework**: FastAPI
- **WebSocket**: websockets library
- **LLM**: OpenAI API (configurable)

## Testing

Test the backend with curl:

```bash
# Health check
curl http://localhost:9000/api/health

# Register device (after Windows client generates MCP URL)
curl -X POST http://localhost:9000/api/device/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "ue_code": "TEST123",
    "device_id": "test-device-123",
    "device_name": "TEST-PC",
    "os_version": "Windows 10",
    "mcp_url": "ws://192.168.1.100:5234/mcp/test-device-123"
  }'
```

