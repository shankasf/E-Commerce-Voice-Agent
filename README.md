# AI Agent Projects Workspace

> **Last Updated:** December 28, 2025

This workspace contains multiple AI-powered voice and chat agent projects.

## 📁 Projects

| Folder | Project | Description |
|--------|---------|-------------|
| **playfunia/** | Playfunia Voice Agent (Kids4Fun) | Voice assistant for Kids4Fun playground at Poughkeepsie Galleria Mall |
| **urackit_voice/** | U Rack IT Voice Support | AI-powered phone support system for IT helpdesk operations |
| **ticket-console/** | U Rack IT Chat Console | Next.js web app for AI-powered IT support ticket management |

---

## 🎮 playfunia/ - Kids4Fun Voice Agent

Production voice assistant for Kids4Fun at Poughkeepsie Galleria Mall. Handles store info, toy catalog, admissions/policies, party planning, orders, payments, and refunds.

**Tech Stack:** Node.js + FastAPI + OpenAI Realtime API + Supabase

---

## 🖥️ urackit_voice/ - IT Voice Support

AI-powered phone support system with intelligent call routing, multi-issue support (email, computer, network, printer, phone, security), ticket management, and human escalation.

**Tech Stack:** Python + OpenAI Realtime API + Twilio + Supabase

---

## 💬 ticket-console/ - IT Chat Console

Web-based ticket management with AI chatbot, automatic AI assignment, multi-agent routing, human handoff, and admin metrics dashboard.

**Tech Stack:** Next.js + OpenAI gpt-5.2 + Supabase

---

## 🤖 AI Agents Architecture

### Multi-Agent System

The system uses a **specialist agent architecture** where a triage agent routes conversations to domain experts:

\`\`\`
Customer → Triage Agent → Specialist Agent(s) → Resolution/Handoff
\`\`\`

| Agent | Role | Key Capabilities |
|-------|------|------------------|
| **Triage Agent** | First responder, routes to specialists | Classify issues, greet customers, detect urgency |
| **Info Agent** | Company/location information | Hours, addresses, contact details, policies |
| **Catalog Agent** | Product/service catalog | Search products, pricing, availability |
| **Admission Agent** | Ticket creation & policies | Create tickets, explain support tiers |
| **Order Agent** | Order management | Track orders, status updates, history |
| **Party Agent** | Booking & scheduling | Reservations, availability, confirmations |

### AI Models Used

- **Voice Channel**: \`gpt-4o-realtime-preview-2024-12-17\` (OpenAI Realtime API)
- **Chat Channel**: \`gpt-5.2\` (OpenAI Responses API)

---

## 📞 Voice AI System

### How It Works

\`\`\`
Phone Call → Twilio → Node.js Gateway → FastAPI Server → OpenAI Realtime
                         (4001)              (8080)         (Voice AI)
\`\`\`

1. **Twilio Webhook** - Receives incoming calls at Node.js gateway
2. **Media WebSocket** - Streams audio to Python FastAPI server
3. **OpenAI Realtime** - Natural voice conversation with multi-agent system
4. **Tool Execution** - Agents call 25+ Supabase-backed functions

### Voice Greeting

> "Welcome to U Rack IT Support. I'm your AI assistant and I can help you with IT support, troubleshooting, ticket status, and connecting you with a human technician. How can I help you today?"

### Key Voice Features

- **Natural Conversation** - Real-time voice with \`alloy\` voice
- **Server VAD** - Automatic speech detection
- **Live Handoff** - Transfer to human agents mid-call
- **Call Logging** - Full conversation history stored in Supabase
- **Analytics Dashboard** - 50+ KPIs with visualizations

### Voice File Structure

\`\`\`
sip_integration/
├── webhook_server.py      # FastAPI routes for Twilio
├── media_stream.py        # WebSocket audio bridge to OpenAI
├── agent_adapter.py       # Registers tools & agents
├── session_manager.py     # Call logging & persistence
└── openai_realtime.py     # Realtime API client
\`\`\`

---

## 💬 Chat AI System (Ticket Console)

### How It Works

\`\`\`
Web Browser → Next.js App → OpenAI Responses API → Resolution
              (3001)             (gpt-5.2)         or Human Handoff
\`\`\`

1. **Requester creates ticket** - AI bot auto-assigned
2. **AI processes message** - Multi-agent routing and response
3. **Step-by-step guidance** - AI asks for confirmation before actions
4. **Human handoff** - Seamless transfer when needed

### Chat Features

| Feature | Description |
|---------|-------------|
| **AI Auto-Assignment** | New tickets automatically get AI bot |
| **"AI is thinking..."** | Spinner indicator during processing |
| **Markdown Responses** | Bold text and structured formatting |
| **Human Handoff** | "I'd like to talk to a human" detection |
| **Confirmation Flow** | AI asks before closing tickets |
| **Data Center Priority** | Tickets from data centers go to humans |

### Human Handoff Triggers

The AI detects these patterns and offers human transfer:

- "talk to a human" / "speak to someone"
- "real person" / "representative"
- "escalate" / "supervisor"
- "this is urgent" / "emergency"

### Chat Roles

| Role | Access |
|------|--------|
| **Requester** | Own tickets, create tickets, chat with AI/agents |
| **Agent** | Assigned tickets, claim escalated tickets, resolve |
| **Admin** | All tickets, manage org/contacts/agents, AI metrics |

### AI Metrics Dashboard

Admins can view comprehensive AI performance metrics:

- **AI Resolution Rate** - % of tickets resolved by AI
- **Time Saved** - Hours saved vs human resolution
- **Cost Savings** - Estimated $ saved at $25/hr rate
- **Response Speed** - AI (seconds) vs Human (minutes)
- **30-Day Trend** - Daily AI vs Human resolutions chart
- **Organization Preference** - Which orgs need more human help
- **Priority Breakdown** - AI vs Human by ticket priority

---

## 🗄️ Database (Supabase)

Both voice and chat share the same PostgreSQL database:

### Core Tables

| Table | Purpose |
|-------|---------|
| \`organizations\` | Client companies with U&E codes |
| \`contacts\` | End users linked to organizations |
| \`locations\` | Sites (Headquarters, Data Center, etc.) |
| \`support_tickets\` | Tickets with status/priority/assignment |
| \`ticket_messages\` | Full conversation history |
| \`ticket_assignments\` | Agent-to-ticket mappings |
| \`support_agents\` | Bot and Human agents |
| \`devices\` | Managed IT assets |

### Key Fields

- \`requires_human_agent\` - Flag for human-only tickets
- \`location_type\` - 'Data Center' triggers human assignment
- \`agent_type\` - 'Bot' or 'Human'

---

## 🛠️ AI Tools (Supabase-Backed)

The AI agents have access to 25+ tools:

### Customer & Contact
- \`create_customer_profile\` - Create new contacts
- \`get_customer_details\` - Lookup customer info
- \`list_customer_orders\` - Order history

### Tickets
- \`create_support_ticket\` - Open new tickets
- \`get_ticket_status\` - Check ticket status
- \`update_ticket_status\` - Change status
- \`escalate_ticket\` - Route to human

### Devices & Assets
- \`list_devices\` - Managed device inventory
- \`get_device_status\` - Online/offline status
- \`search_knowledge_base\` - IT articles & guides

### Orders & Payments
- \`create_order\` - New orders
- \`get_order_details\` - Order lookup
- \`record_payment\` - Payment processing

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PM2 (process manager)
- Supabase project

### Environment Variables

\`\`\`bash
# .env.local (both systems)
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...
\`\`\`

### Start Voice AI

\`\`\`bash
# Terminal 1 - Python SIP Server
cd /root/webhook
source .venv/bin/activate
python main.py  # Port 8080

# Terminal 2 - Node Gateway
node server.js  # Port 4001
\`\`\`

### Start Chat Console

\`\`\`bash
cd /root/webhook/ticket-console
npm run build
npm run start  # Port 3001
\`\`\`

### Production (PM2)

\`\`\`bash
# Voice AI
pm2 start main.py --name urackit-voice --interpreter python3

# Chat Console
pm2 start npm --name tms-console -- start

# View logs
pm2 logs urackit-voice
pm2 logs tms-console
\`\`\`

---

## 📊 Dashboards

### Voice Analytics Dashboard
- URL: \`https://webhook.callsphere.tech/dashboard\`
- Auth: Basic Auth (admin/password)
- Features: Call volume, sentiment, conversions, tool usage

### Chat Admin Panel
- URL: \`https://urackit.callsphere.tech/tms/dashboard/admin\`
- Features: All tickets, agent management, AI metrics

---

## 🔄 Human Handoff Flow

### Voice Channel
1. Customer says "I need to speak to someone"
2. AI: "I'll transfer you to a human technician now"
3. Call routes to available human agent
4. Full context passed to agent

### Chat Channel
1. Customer types "can I talk to a human?"
2. AI: "Would you like me to transfer you to a human technician?"
3. Customer confirms: "yes"
4. AI: "I'm transferring you now. Alex Martinez has been assigned."
5. Human agent sees full conversation history

---

## 📁 Project Structure

\`\`\`
/root/webhook/
├── main.py                    # Voice AI entry point
├── server.js                  # Node gateway + voice dashboard
├── agents.py                  # Base agent definitions
├── voice.py                   # Voice helpers
│
├── app_agents/                # Specialist AI agents
│   ├── triage_agent.py
│   ├── info_agent.py
│   ├── catalog_agent.py
│   ├── admission_agent.py
│   ├── order_agent.py
│   └── party_agent.py
│
├── sip_integration/           # Twilio/Voice integration
│   ├── webhook_server.py
│   ├── media_stream.py
│   ├── agent_adapter.py
│   └── session_manager.py
│
├── db/                        # Database layer
│   ├── queries_supabase.py
│   ├── database.py
│   └── schema.py
│
├── memory/                    # Session state
│   ├── memory.py
│   └── knowledge_base.py
│
└── ticket-console/            # Chat AI (Next.js)
    ├── src/
    │   ├── app/
    │   │   ├── api/
    │   │   │   ├── ai-resolve/     # Chat AI endpoint
    │   │   │   └── ai-metrics/     # Metrics API
    │   │   └── dashboard/
    │   │       ├── admin/
    │   │       ├── agent/
    │   │       └── requester/
    │   ├── lib/
    │   │   ├── ai-agents/          # Modular agent definitions
    │   │   ├── api.ts              # Role-based data access
    │   │   └── supabase.ts         # DB client
    │   └── components/
    │       ├── ChatUI.tsx
    │       └── AIMetricsModal.tsx
    └── README.md
\`\`\`

---

## 🎯 Key Benefits

| Benefit | Impact |
|---------|--------|
| **24/7 Availability** | AI never sleeps, instant responses anytime |
| **Scalable Support** | Handle unlimited tickets simultaneously |
| **Cost Reduction** | Up to 70% reduction in support costs |
| **Consistent Quality** | Same accurate responses every time |
| **Human When Needed** | Seamless handoff preserves context |
| **Full Analytics** | Track AI performance and optimize |

---

## 📝 License

Proprietary - U Rack IT / CallSphere Technologies

---

## 🆘 Support

For technical issues:
- Check PM2 logs: \`pm2 logs --lines 200\`
- Supabase dashboard for data issues
- OpenAI usage dashboard for API issues
