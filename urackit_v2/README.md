# U Rack IT v2 - AI-Powered IT Support Platform

A modern 3-tier architecture for AI-powered IT helpdesk with voice integration, real-time dashboard, and multi-agent LLM orchestration.

## 🌟 Overview

U Rack IT v2 is a complete rebuild of the IT support voice agent platform, featuring:

- **Real-time Voice AI** - Twilio SIP integration with OpenAI Realtime API for natural voice conversations
- **Multi-Agent System** - Specialized AI agents for different IT support domains (devices, tickets, network, etc.)
- **Live Dashboard** - Real-time metrics, call monitoring, ticket management, and device tracking
- **RAG Knowledge Base** - ChromaDB-powered knowledge retrieval for accurate IT support responses

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Overview   │  │   Calls     │  │  Tickets    │  │  Devices/Orgs      │ │
│  │  Dashboard  │  │   Logs      │  │  Manager    │  │  Management        │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────┬───────────┘ │
└─────────┼────────────────┼────────────────┼───────────────────┼─────────────┘
          │                │                │                   │
          │           WebSocket (Socket.io)  │    REST API      │
          ▼                ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (NestJS)                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │    Auth     │  │   Events    │  │  Dashboard  │  │  Tickets/Calls     │ │
│  │    JWT      │  │  Gateway    │  │   Service   │  │  CRUD Services     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────┬───────────┘ │
│         │                │                │                   │             │
│         └────────────────┴────────────────┴───────────────────┘             │
│                                   │                                          │
│                              Prisma ORM                                      │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────────┐
│   PostgreSQL    │     │  AI Service     │     │        Twilio               │
│   (Supabase)    │     │  (FastAPI)      │◀────│   Voice/SIP Webhooks        │
│                 │     │                 │     │                             │
│  • call_logs    │     │  • Multi-Agent  │     │  • Inbound calls            │
│  • tickets      │     │  • RAG Search   │     │  • Media streams            │
│  • devices      │     │  • Summarize    │     │  • WebSocket audio          │
│  • orgs         │     │  • Classify     │     │                             │
│  • ai_usage     │     │  • OpenAI RT    │     │                             │
└─────────────────┘     └─────────────────┘     └─────────────────────────────┘
```

## 📁 Project Structure

```
urackit_v2/
├── frontend/                    # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── layout/          # Sidebar, Header
│   │   │   ├── cards/           # Metric cards, stat cards
│   │   │   └── ui/              # Buttons, inputs, modals
│   │   ├── pages/               # Route pages
│   │   │   ├── OverviewPage     # Main dashboard
│   │   │   ├── CallsPage        # Call logs & analytics
│   │   │   ├── TicketsPage      # Ticket management
│   │   │   ├── DevicesPage      # Device inventory
│   │   │   ├── OrganizationsPage
│   │   │   ├── ContactsPage
│   │   │   ├── CostsPage        # AI/Twilio cost tracking
│   │   │   └── SystemPage       # System health
│   │   ├── services/            # API clients
│   │   │   ├── api.ts           # REST API client
│   │   │   ├── websocket.ts     # Socket.io client
│   │   │   └── useRealtime.ts   # Real-time hooks
│   │   ├── types/               # TypeScript interfaces
│   │   └── context/             # React context (Auth)
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                     # NestJS + Prisma
│   ├── src/
│   │   ├── auth/                # JWT authentication
│   │   ├── dashboard/           # Dashboard aggregations
│   │   ├── tickets/             # Ticket CRUD + lifecycle
│   │   ├── calls/               # Call logs + stats
│   │   ├── devices/             # Device management
│   │   ├── organizations/       # Org management
│   │   ├── contacts/            # Contact management
│   │   ├── events/              # WebSocket gateway
│   │   ├── ai/                  # AI service client
│   │   ├── prisma/              # Prisma service
│   │   └── main.ts              # App entry point
│   ├── prisma/
│   │   └── schema.prisma        # Database schema (32 models)
│   ├── ecosystem.config.js      # PM2 config
│   └── package.json
│
├── ai-service/                  # Python FastAPI
│   ├── main.py                  # FastAPI app
│   ├── config.py                # Environment config
│   ├── app_agents/              # AI Agent definitions
│   │   ├── triage_agent.py      # Initial call routing
│   │   ├── device_agent.py      # Device troubleshooting
│   │   ├── ticket_agent.py      # Ticket operations
│   │   ├── network_agent.py     # Network issues
│   │   ├── email_agent.py       # Email support
│   │   ├── computer_agent.py    # Computer issues
│   │   ├── printer_agent.py     # Printer support
│   │   ├── phone_agent.py       # Phone/VoIP issues
│   │   ├── security_agent.py    # Security concerns
│   │   └── lookup_agent.py      # Data lookup
│   ├── db/
│   │   ├── connection.py        # Supabase REST client
│   │   └── queries.py           # DB function tools
│   ├── memory/
│   │   ├── knowledge_base.py    # ChromaDB RAG
│   │   └── memory.py            # Session memory
│   ├── sip_integration/         # Twilio voice
│   │   ├── webhook_server.py    # Twilio webhooks
│   │   ├── media_stream.py      # Audio streaming
│   │   ├── openai_realtime.py   # OpenAI Realtime API
│   │   ├── session_manager.py   # Call sessions
│   │   ├── agent_adapter.py     # Agent integration
│   │   └── twilio_provider.py   # Twilio client
│   ├── urackit_knowledge.txt    # Knowledge base content
│   ├── requirements.txt
│   └── ecosystem.config.js      # PM2 config
│
└── ARCHITECTURE.md              # Detailed architecture docs
```

## 🔧 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7.3 | Build tool |
| Tailwind CSS | 4.1 | Styling |
| React Router | 7.11 | Routing |
| TanStack Query | 5.90 | Data fetching |
| Recharts | 3.6 | Charts/graphs |
| Socket.io Client | 4.8 | Real-time updates |
| Lucide React | 0.562 | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 11.0 | API framework |
| Prisma | 7.2 | ORM |
| PostgreSQL | 15 | Database (Supabase) |
| Socket.io | 4.8 | WebSocket server |
| Passport JWT | 4.0 | Authentication |
| Swagger | 11.2 | API docs |
| Axios | 1.13 | HTTP client |

### AI Service
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.115 | API framework |
| OpenAI Agents SDK | 0.0.15 | Multi-agent orchestration |
| ChromaDB | 0.5 | Vector store / RAG |
| Twilio | 9.4 | Voice/SIP |
| WebSockets | 14.1 | Real-time audio |
| Pydantic | 2.10 | Data validation |

## 🗃️ Database Schema

The system uses **32 database models** in Supabase PostgreSQL:

### Core Tables
| Table | Description |
|-------|-------------|
| `organizations` | Client companies with U&E codes |
| `contacts` | People within organizations |
| `devices` | IT assets (computers, printers, etc.) |
| `locations` | Physical locations/sites |
| `support_tickets` | IT support tickets |
| `call_logs` | Voice call records |

### AI & Analytics
| Table | Description |
|-------|-------------|
| `ai_usage_logs` | OpenAI API token usage & costs |
| `twilio_usage_logs` | Twilio call minutes & costs |
| `agent_interactions` | AI agent conversation turns |
| `conversation_analysis` | Sentiment, intent, keywords |
| `daily_metrics` | Aggregated daily stats |
| `hourly_metrics` | Aggregated hourly stats |
| `system_health_logs` | System performance metrics |

### Support Infrastructure
| Table | Description |
|-------|-------------|
| `support_agents` | Human/bot agents |
| `ticket_assignments` | Agent-ticket assignments |
| `ticket_escalations` | Escalation history |
| `ticket_messages` | Ticket conversation threads |
| `ticket_statuses` | Status lookup (Open, Pending, etc.) |
| `ticket_priorities` | Priority lookup (Low, Medium, High, Critical) |

### Device Management
| Table | Description |
|-------|-------------|
| `device_types` | Type lookup (Desktop, Laptop, etc.) |
| `device_manufacturers` | Manufacturer lookup |
| `device_models` | Model lookup |
| `operating_systems` | OS lookup |
| `domains` | AD domain lookup |
| `update_statuses` | Windows update status |

## 🚀 Deployment

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL (Supabase)
- PM2 (process manager)
- Nginx (reverse proxy)

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="7d"
PORT=3003
AI_SERVICE_URL="http://localhost:8081"
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
FRONTEND_URL="http://localhost:5173"
```

**AI Service (.env)**
```env
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-realtime-preview"
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
PORT=8081
DEBUG=false
```

### Quick Start (Development)

```bash
# Clone and navigate
cd urackit_v2

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:5173

# Backend (new terminal)
cd backend
npm install
npx prisma generate
npm run start:dev  # http://localhost:3003

# AI Service (new terminal)
cd ai-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8081
```

### Production Deployment

```bash
# Build frontend
cd frontend
npm run build

# Start with PM2
pm2 start ecosystem.config.js  # in backend/
pm2 start ecosystem.config.js  # in ai-service/

# Nginx config
server {
    listen 443 ssl;
    server_name webhook.callsphere.tech;
    
    # Dashboard
    location /v2/dashboard/ {
        proxy_pass http://localhost:3003/;
    }
    
    # API
    location /v2/api/ {
        proxy_pass http://localhost:3003/v2/api/;
    }
    
    # AI Service (SIP webhooks)
    location /v2/ai/ {
        proxy_pass http://localhost:8081/;
    }
}
```

## 📡 API Endpoints

### Backend (NestJS) - Port 3003

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v2/api/auth/login` | JWT authentication |
| GET | `/v2/api/auth/me` | Current user profile |
| GET | `/v2/api/dashboard/overview` | Dashboard metrics |
| GET | `/v2/api/dashboard/calls` | Call statistics |
| GET | `/v2/api/dashboard/tickets` | Ticket statistics |
| GET | `/v2/api/dashboard/devices` | Device inventory |
| GET | `/v2/api/dashboard/costs` | Cost analytics |
| GET | `/v2/api/dashboard/system` | System health |
| GET | `/v2/api/tickets` | List tickets |
| POST | `/v2/api/tickets` | Create ticket |
| GET | `/v2/api/tickets/:id` | Get ticket details |
| PATCH | `/v2/api/tickets/:id` | Update ticket |
| GET | `/v2/api/calls` | List calls |
| GET | `/v2/api/calls/:id` | Get call details |
| GET | `/v2/api/devices` | List devices |
| GET | `/v2/api/organizations` | List organizations |
| GET | `/v2/api/contacts` | List contacts |

### AI Service (FastAPI) - Port 8081

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/agents` | List AI agents |
| POST | `/api/chat` | Chat with AI |
| POST | `/api/chat/start` | Start new session |
| POST | `/api/summarize` | Summarize transcript |
| POST | `/api/classify` | Classify issue |
| GET | `/api/knowledge/search` | RAG search |
| GET | `/api/knowledge/stats` | Knowledge base stats |
| POST | `/twilio` | Twilio voice webhook |
| WS | `/media-stream/{id}` | Twilio audio stream |
| GET | `/voice-token` | Twilio client token |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `dashboard:update` | Server → Client | Metrics changed |
| `call:started` | Server → Client | New call began |
| `call:ended` | Server → Client | Call completed |
| `call:updated` | Server → Client | Call status changed |
| `ticket:created` | Server → Client | New ticket |
| `ticket:updated` | Server → Client | Ticket modified |

## 🤖 AI Agents

The system uses 10 specialized AI agents:

| Agent | Purpose | Tools |
|-------|---------|-------|
| **TriageAgent** | Initial routing, caller identification | find_organization, find_contact, handoffs |
| **DeviceAgent** | Device troubleshooting, status checks | get_device_status, get_device_details, find_device |
| **TicketAgent** | Ticket CRUD, status updates | create_ticket, update_ticket, lookup_ticket |
| **NetworkAgent** | Network connectivity issues | knowledge_search |
| **EmailAgent** | Email/Outlook support | knowledge_search |
| **ComputerAgent** | Computer/desktop issues | knowledge_search |
| **PrinterAgent** | Printer troubleshooting | knowledge_search |
| **PhoneAgent** | Phone/VoIP support | knowledge_search |
| **SecurityAgent** | Security concerns, password resets | password_reset, access_check |
| **LookupAgent** | Data lookup, organization search | all DB query tools |

## 📊 Dashboard Features

### Overview Page
- Total calls today with AI resolution rate
- Active devices (online/offline)
- Open tickets count
- Token usage meter
- Real-time WebSocket updates

### Calls Page
- Call history with filters
- Call duration analytics
- Hourly distribution chart
- Agent usage breakdown
- Transcript viewer

### Tickets Page
- Ticket list with status filters
- Priority breakdown
- Assignment management
- Escalation tracking
- SLA compliance

### Devices Page
- Device inventory grid
- Online/offline status
- Organization grouping
- Last seen timestamps
- Device details modal

### Costs Page
- Daily cost trend
- AI vs Twilio breakdown
- Cost per call metrics
- Token usage by model
- ROI calculations

### System Page
- API latency metrics
- Database status
- Memory/CPU usage
- Error rates
- Alert notifications

## 🔐 Security

- **JWT Authentication** - Secure API access
- **Row Level Security** - Supabase RLS policies
- **CORS Protection** - Configurable origins
- **Environment Variables** - Secrets management
- **HTTPS** - SSL/TLS encryption

## 📈 Monitoring

```bash
# View logs
pm2 logs urackit-v2-backend
pm2 logs urackit-v2-ai

# Monitor processes
pm2 monit

# Status
pm2 status
```

## 🔗 URLs (Production)

| Service | URL |
|---------|-----|
| Dashboard | https://webhook.callsphere.tech/v2/dashboard/ |
| API | https://webhook.callsphere.tech/v2/api/ |
| Swagger Docs | https://webhook.callsphere.tech/v2/api/docs |
| AI Health | https://webhook.callsphere.tech/v2/ai/health |

## 📝 License

Proprietary - All rights reserved.

---

Built with ❤️ by the CallSphere Team
