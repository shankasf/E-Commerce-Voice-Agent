# Real Estate Property Management Voice Agent

A real-time voice agent for real estate property management powered by xAI's Grok Voice Agent API and Twilio telephony integration.

## Features

- **Voice-Powered Property Management**: Handle tenant inquiries, maintenance requests, and property information via natural conversation
- **xAI Grok Voice Integration**: Uses xAI's cutting-edge voice API for natural, low-latency conversations
- **Multi-Agent Architecture**: Specialized agents for different property management functions
- **Twilio Telephony**: Accept and make phone calls with seamless audio streaming
- **Tool Calling**: Integrated with property database for real-time lookups and actions
- **Real-Time Dashboard**: Monitor live calls, agent activity, and analytics

## Architecture

```
Phone Call ←SIP→ Twilio ←WebSocket→ FastAPI Server ←WebSocket→ xAI Voice API
                                         ↓
                                    PostgreSQL
                                   (via Supabase)
```

## Agents

1. **Triage Agent** - Greets callers, identifies them, and routes to appropriate specialist
2. **Property Agent** - Handles property information, availability, and listings
3. **Maintenance Agent** - Manages maintenance requests and work orders
4. **Leasing Agent** - Handles lease inquiries, applications, and renewals
5. **Payment Agent** - Assists with rent payments, balances, and payment history
6. **Emergency Agent** - Handles urgent issues and emergency protocols

## Setup

### Prerequisites

- Python 3.11+
- xAI API Key (https://console.x.ai)
- Twilio Account with phone number
- PostgreSQL database (or Supabase)

### Installation

```bash
# Navigate to the project
cd realestate_voice

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env with your API keys

# Initialize database
# Run the SQL in db/schema.sql in your PostgreSQL database
```

### Environment Variables

```env
# xAI Configuration
XAI_API_KEY=your_xai_api_key
XAI_VOICE=Ara  # Options: Ara, Rex, Sal, Eve, Leo

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Server
HOST=0.0.0.0
PORT=8080
WEBHOOK_BASE_URL=https://your-domain.com
```

### Running the Server

```bash
# Development
python main.py

# Or with uvicorn
uvicorn main:app --host 0.0.0.0 --port 8080 --reload

# Production with PM2
pm2 start ecosystem.config.js
```

### Twilio Configuration

1. Go to your Twilio Console
2. Configure your phone number webhook:
   - Voice & Fax → A Call Comes In → Webhook
   - URL: `https://your-domain.com/twilio`
   - Method: POST

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Detailed health status |
| `/twilio` | POST | Twilio voice webhook |
| `/twilio/ws/{call_sid}` | WebSocket | Media stream endpoint |
| `/dashboard` | GET | Analytics dashboard |
| `/api/live-sessions` | GET | Active call sessions |
| `/api/call-history` | GET | Call history |

## Voice Commands Examples

**Tenant Inquiries:**
- "I'd like to report a maintenance issue"
- "What's my current rent balance?"
- "When is my lease up for renewal?"
- "Is there a 2-bedroom available?"

**Property Information:**
- "What amenities does the property have?"
- "What are the office hours?"
- "How do I pay my rent online?"

**Emergency:**
- "I have a water leak emergency"
- "There's no heat in my unit"
- "I smell gas in my apartment"

## Project Structure

```
realestate_voice/
├── main.py                 # FastAPI application entry
├── config.py               # Configuration management
├── requirements.txt        # Python dependencies
├── ecosystem.config.js     # PM2 configuration
├── .env.example           # Environment template
├── db/
│   ├── __init__.py
│   ├── connection.py      # Database connection
│   ├── queries.py         # Database query tools
│   └── schema.sql         # Database schema
├── agents/
│   ├── __init__.py
│   ├── triage_agent.py    # Entry point agent
│   ├── property_agent.py  # Property information
│   ├── maintenance_agent.py # Maintenance requests
│   ├── leasing_agent.py   # Lease management
│   ├── payment_agent.py   # Payment handling
│   └── emergency_agent.py # Emergency protocols
├── xai_integration/
│   ├── __init__.py
│   ├── realtime.py        # xAI WebSocket handler
│   ├── session_manager.py # Call session management
│   ├── media_stream.py    # Audio streaming
│   └── twilio_handler.py  # Twilio webhooks
└── static/
    ├── dashboard.html     # Analytics dashboard
    └── js/
        └── dashboard.js   # Dashboard JavaScript
```

## License

MIT License
