# SIP Integration for Voice Calls

This module provides voice call handling via Twilio SIP and OpenAI Realtime API, enabling the multi-agent chatbot to handle phone calls.

## Architecture (SOLID Principles)

```
sip_integration/
├── __init__.py           # Package exports
├── config.py             # Configuration management (SRP)
├── interfaces.py         # Abstract interfaces (ISP, DIP)
├── twilio_provider.py    # Twilio-specific implementation (SRP, OCP)
├── openai_realtime.py    # OpenAI Realtime API connection (SRP)
├── session_manager.py    # Voice session lifecycle (SRP)
├── agent_adapter.py      # Multi-agent system integration (DIP, OCP)
├── media_stream.py       # Audio streaming handler (SRP)
├── webhook_server.py     # FastAPI webhook endpoints (SRP)
├── server.py             # Application entry point
├── requirements.txt      # Dependencies
└── README.md            # This file
```

### SOLID Principles Applied:

- **Single Responsibility (SRP)**: Each class/module has one job
- **Open/Closed (OCP)**: Extended through interfaces, not modification
- **Liskov Substitution (LSP)**: Interfaces ensure interchangeability
- **Interface Segregation (ISP)**: Small, focused interfaces
- **Dependency Inversion (DIP)**: Depend on abstractions, not concretions

## Setup

### 1. Install Dependencies

```bash
pip install -r sip_integration/requirements.txt
```

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# OpenAI
OPENAI_API_KEY=sk-your-api-key
OPENAI_PROJECT_ID=proj_rvschbvVLP2QAgoYHwwKuL7Q

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+16508552762

# Webhook Server
WEBHOOK_HOST=0.0.0.0
WEBHOOK_PORT=8080
WEBHOOK_BASE_URL=https://webhook.callsphere.tech
```

### 3. Configure Twilio Phone Number

1. Go to Twilio Console → Phone Numbers → Your Number
2. Under "Voice Configuration":
   - **A call comes in**: Webhook
   - **URL**: `https://webhook.callsphere.tech/twilio`
   - **HTTP**: POST

### 4. Run the Server

```bash
# Option 1: Direct run
python -m sip_integration.server

# Option 2: With uvicorn
uvicorn sip_integration.server:app --host 0.0.0.0 --port 8080 --reload

# Option 3: Production with multiple workers
uvicorn sip_integration.server:app --host 0.0.0.0 --port 8080 --workers 4
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Detailed health status |
| `/twilio` | POST | Incoming call webhook |
| `/twilio/status` | POST | Call status updates |
| `/media-stream/{session_id}` | WebSocket | Audio streaming |
| `/sessions` | GET | List active sessions |

## Call Flow

```
1. Caller dials Twilio number
2. Twilio POSTs to /twilio webhook
3. Server creates session, returns TwiML with WebSocket URL
4. Twilio opens WebSocket to /media-stream/{session_id}
5. Server connects to OpenAI Realtime API
6. Bidirectional audio streaming:
   - Twilio → Server → OpenAI (caller audio)
   - OpenAI → Server → Twilio (AI response)
7. Function calls routed to multi-agent system
8. Call ends, session cleaned up
```

## Voice Agent Capabilities

The voice agent can:

- **General Information**: Store hours, locations, FAQs
- **Toy Catalog**: Search products, get details, pricing
- **Admission**: Ticket prices, grip sock policy
- **Party Planning**: Package info, availability, bookings
- **Order Management**: Status, lookups (voice-safe operations only)

## Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `voice` | `alloy` | OpenAI voice (alloy, echo, shimmer, ash, ballad, coral, sage, verse) |
| `input_audio_format` | `g711_ulaw` | Audio format from Twilio |
| `output_audio_format` | `g711_ulaw` | Audio format to Twilio |
| `session_timeout_seconds` | `600` | Session timeout (10 min) |
| `max_concurrent_sessions` | `100` | Max simultaneous calls |

## Monitoring

Check active sessions:
```bash
curl http://localhost:8080/sessions
```

Response:
```json
{
  "count": 2,
  "sessions": [
    {
      "session_id": "voice-abc12345-xyz98765",
      "call_sid": "CAxxxxx",
      "from": "+1234567890",
      "state": "connected",
      "created_at": 1701705600.0,
      "last_activity": 1701705650.0
    }
  ]
}
```

## Troubleshooting

### No audio from AI
- Check OpenAI API key and project ID
- Verify realtime model access in OpenAI dashboard
- Check audio format settings match Twilio expectations

### Webhook not receiving calls
- Verify Twilio number configuration
- Check WEBHOOK_BASE_URL is publicly accessible
- Ensure HTTPS is configured (Twilio requires HTTPS)

### Session limit reached
- Increase `max_concurrent_sessions` if needed
- Check for zombie sessions (adjust timeout)
- Monitor with `/sessions` endpoint

## Security Notes

- Validate Twilio signatures in production (set `TWILIO_AUTH_TOKEN`)
- Use HTTPS for all webhook endpoints
- Secure sensitive tool operations (no create/update via voice without verification)
- Rate limit API endpoints in production
