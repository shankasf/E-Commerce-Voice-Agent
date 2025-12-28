# U Rack IT / U Talk.tel - AI Voice Support System

> **Last Updated:** December 28, 2025

An AI-powered phone support system for IT helpdesk operations. Built with OpenAI's Realtime API and Twilio for voice integration.

## Features

- **Intelligent Call Routing**: Automatically routes calls to specialized agents based on issue type
- **Multi-Issue Support**: Handles email, computer, network, printer, phone, and security issues
- **Ticket Management**: Creates and tracks support tickets in Supabase
- **Knowledge Base**: Semantic search over troubleshooting guides
- **Human Escalation**: Easy handoff to human technicians when needed
- **Security Priority**: Immediate escalation for security incidents
- **Analytics Dashboard**: Real-time 100+ metrics dashboard with call analytics, AI performance, costs, and system health

## Live URLs

- **Voice Webhook**: https://webhook.callsphere.tech/twilio
- **Dashboard**: https://webhook.callsphere.tech/dashboard
- **Web Dialer**: https://webhook.callsphere.tech/dialer
- **Health Check**: https://webhook.callsphere.tech/health

## Project Structure

```
urackit_voice/
├── main.py                 # Streamlit demo UI
├── agents.py               # Agent framework
├── urackit_knowledge.txt   # Knowledge base content
├── app_agents/             # Specialized support agents
│   ├── triage_agent.py     # Main entry point / router
│   ├── email_agent.py      # Email & Identity issues
│   ├── computer_agent.py   # Computer & User issues
│   ├── network_agent.py    # Internet & Remote Access
│   ├── printer_agent.py    # Printers & Scanning
│   ├── phone_agent.py      # Phones / VoIP
│   ├── security_agent.py   # Security incidents
│   ├── ticket_agent.py     # Ticket management
│   ├── device_agent.py     # Device lookup
│   ├── lookup_agent.py     # Contact/org lookup
│   └── servicedesk_agent.py # Ticket status & admin
├── db/                     # Database layer
│   ├── complete_schema.sql # Complete PostgreSQL schema for Supabase
│   ├── dashboard_queries.py # Dashboard metrics queries (optimized)
│   ├── connection.py       # Database connection pool
│   ├── database.py         # Supabase REST client
│   └── queries.py          # Function tools for agents
├── memory/                 # Memory & Knowledge
│   ├── knowledge_base.py   # ChromaDB semantic search
│   └── memory.py           # Conversation memory
├── sip_integration/        # Twilio voice integration
│   ├── server.py           # Main server entry point
│   ├── webhook_server.py   # FastAPI webhooks + CORS
│   ├── dashboard_api.py    # Dashboard REST API endpoints
│   ├── config.py           # Configuration
│   ├── interfaces.py       # Abstract interfaces
│   ├── agent_adapter.py    # Agent-to-voice bridge
│   ├── media_stream.py     # Audio streaming
│   ├── openai_realtime.py  # OpenAI Realtime API
│   ├── session_manager.py  # Call session management + logging
│   └── twilio_provider.py  # Twilio TwiML generation
└── static/                 # Frontend files
    ├── dashboard.html      # Analytics dashboard UI
    ├── dialer.html         # Web phone dialer
    └── js/                 # Dashboard JavaScript
        ├── dashboard.js
        ├── dashboard-charts.js
        └── dashboard-pages.js
```

## Setup

### 1. Database Setup (Supabase)

1. Create a new Supabase project at https://supabase.com
2. Run the complete schema file in the SQL Editor:
   ```
   db/complete_schema.sql
   ```
   This includes:
   - All tables (tickets, contacts, devices, call_logs, ai_usage, etc.)
   - Indexes for dashboard performance
   - Views for analytics
   - RLS policies
   - Seed data for organizations/devices
3. Copy your project URL and API keys

### 2. Environment Variables

Create a `.env` file:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PG_CONNECTION_URI=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
OPENAI_PROJECT_ID=your-project-id

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_API_KEY=your-api-key
TWILIO_API_SECRET=your-api-secret
TWIML_APP_SID=your-twiml-app-sid

# Server
WEBHOOK_HOST=0.0.0.0
WEBHOOK_PORT=8080
WEBHOOK_BASE_URL=https://your-domain.com
```

### 3. Install Dependencies

```bash
pip install -r sip_integration/requirements.txt
```

### 4. Run the Voice Server

```bash
# Using the module
python -m sip_integration.server

# Or with uvicorn
uvicorn sip_integration.server:app --host 0.0.0.0 --port 8080 --reload
```

### 5. Configure Twilio

1. Go to your Twilio console
2. Navigate to Phone Numbers → Manage → Active Numbers
3. Select your phone number
4. Under "Voice & Fax", set the webhook URL:
   - **When a call comes in**: `https://your-domain.com/twilio` (POST)

## Demo UI

For testing without voice:

```bash
streamlit run main.py
```

## Support Categories

| Category | Issues Covered |
|----------|---------------|
| Email & Identity | Outlook, password resets, mailbox, mobile email |
| Computer & User | Slow PC, crashes, login, blue screen, new setup |
| Internet & Remote Access | Wi-Fi, VPN, remote desktop, network outages |
| Printers & Scanning | Print jobs, scan to email, copier errors |
| Phones / VoIP | Dial tone, voicemail, call quality |
| Security | Phishing, suspicious links, incidents |
| Service Desk | Ticket status, billing, human transfer |

## Escalation Triggers

The system automatically escalates to human technicians for:

- Office-wide network outages
- Security incidents (clicked suspicious link)
- Caller explicitly requests a human
- Issues that cannot be resolved remotely

## Architecture

- **Triage Agent**: Routes calls to specialists
- **Specialist Agents**: Domain-specific troubleshooting
- **Knowledge Base**: ChromaDB vector search over support docs
- **Ticket System**: Supabase PostgreSQL for persistence
- **Voice Layer**: Twilio + OpenAI Realtime API
- **Dashboard**: Real-time analytics with Chart.js/ApexCharts

## Dashboard Metrics

The analytics dashboard provides 100+ real-time metrics:

| Category | Metrics |
|----------|---------|
| Call Metrics | Total calls, active calls, abandoned rate, avg duration, hourly distribution |
| AI Performance | Resolution rate, response time, agent distribution, escalation rate |
| Tickets | Open/resolved tickets, SLA compliance, priority breakdown |
| Customers | Unique callers, repeat callers, satisfaction scores |
| System Health | CPU, memory, disk usage, API latency, error rates |
| Costs | AI token usage, Twilio minutes, cost per call, ROI analysis |
| Trends | Daily trends, issue categories, sentiment analysis |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check with active session count |
| `GET /dashboard` | Analytics dashboard UI |
| `GET /dialer` | Web phone dialer UI |
| `POST /twilio` | Twilio voice webhook |
| `GET /api/dashboard/overview` | All dashboard metrics |
| `GET /api/dashboard/calls` | Call metrics |
| `GET /api/dashboard/ai-performance` | AI agent metrics |
| `GET /api/dashboard/tickets` | Ticket metrics |
| `GET /api/dashboard/costs` | Cost & usage metrics |
| `GET /api/dashboard/system` | System health metrics |
| `GET /api/dashboard/trends` | Trend data for charts |

## License

Proprietary - U Rack IT / U Talk.tel
