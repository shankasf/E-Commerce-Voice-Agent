# Quick Start Guide

## 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## 2. Create Environment File

Create a `.env` file:

```env
# Required: Test user credentials
TEST_EMAIL=test@example.com
TEST_UE_CODE=TEST123

# Optional: OpenAI API (for LLM features)
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4

# Backend configuration
PORT=9000
```

**Note**: 
- `TEST_EMAIL` and `TEST_UE_CODE` are required for device registration
- If you don't have an OpenAI API key, the backend will work in mock mode

## 3. Create Test User (Optional)

```bash
python create_test_user.py
```

This creates a user in the JSON database using credentials from `.env`.

## 4. Start Backend

```bash
python start.py
```

Or:
```bash
uvicorn main:app --host 0.0.0.0 --port 9000 --reload
```

## 5. Test the Backend

### Option A: Use Chat UI (Recommended)
Open browser: http://localhost:9000/

This opens a simple chat interface where you can:
- Enter your User ID
- Send problem descriptions
- See tool execution results
- View solutions

### Option B: Use API Docs
Open browser: http://localhost:9000/docs

Or test with curl:

```bash
# Health check
curl http://localhost:9000/api/health

# Register device (after Windows client is running)
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

## 6. Solve a Problem

After device is registered:

```bash
curl -X POST http://localhost:9000/api/problem/solve \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "problem_description": "My computer is running slow"
  }'
```

## Architecture Flow

1. Windows client starts → Generates MCP URL → Registers with backend
2. User reports problem → Backend receives problem
3. LLM analyzes → Creates tool execution plan
4. Backend connects → Connects to client's WebSocket server
5. Tools executed → Client executes tools, returns results
6. LLM summarizes → Generates solution summary
7. Response sent → Returns solution to user

