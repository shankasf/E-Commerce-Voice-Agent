# U Rack IT - Chat AI Ticket Console

Next.js-based web application for AI-powered IT support ticket management. Part of the U Rack IT multi-channel support system.

## 🎯 Overview

The Ticket Console provides a **chat-based interface** where customers can create support tickets and interact with an **AI agent** that uses OpenAI's gpt-5.2 model to provide step-by-step troubleshooting assistance.

```
Customer → Create Ticket → AI Bot Auto-Assigned → Chat → Resolution or Human Handoff
```

## ✨ Key Features

### AI-Powered Support
- **Automatic AI Assignment** - New tickets get AI bot assigned instantly
- **Multi-Agent Routing** - Triage agent routes to specialists
- **Step-by-Step Guidance** - AI guides users through troubleshooting
- **Confirmation Before Actions** - AI asks before closing/escalating
- **"AI is thinking..."** - Visual spinner during processing

### Human Handoff
- **Trigger Detection** - "talk to human", "escalate", "supervisor"
- **Confirmation Flow** - AI asks: "Would you like me to transfer you?"
- **Context Preservation** - Human sees full conversation history
- **Data Center Priority** - Tickets from data centers go directly to humans

### AI Metrics Dashboard
Admins can view comprehensive AI performance:
- AI Resolution Rate (% resolved by AI)
- Time Saved (hours saved vs human)
- Cost Savings ($25/hr baseline)
- Response Speed Comparison
- 30-Day Trend Charts
- Organization Preference Analysis

## 👥 User Roles

| Role | Description | Access |
|------|-------------|--------|
| **Requester** | End users/customers | Own tickets only, create tickets, chat |
| **Agent** | Human support staff | Assigned + escalated tickets, resolve |
| **Admin** | System administrators | All data, metrics, user management |

### Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Requester | `john@techcorp.com` | `demo123` |
| Agent | `alex@urackit.com` | `agent123` |
| Admin | `admin@urackit.com` | `admin123` |

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI Responses API (gpt-5.2)
- **Icons**: Lucide React
- **Date Utils**: date-fns

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase project
- OpenAI API key

### Installation

```bash
cd /root/webhook/ticket-console
npm install
```

### Environment Setup

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

### Development

```bash
npm run dev
# Opens at http://localhost:3001
```

### Production Build

```bash
npm run build
npm run start
```

### PM2 Deployment

```bash
pm2 start npm --name tms-console -- start
pm2 logs tms-console
```

## 📁 Project Structure

```
ticket-console/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai-resolve/          # AI chat endpoint
│   │   │   │   └── route.ts
│   │   │   └── ai-metrics/          # Metrics API
│   │   │       └── route.ts
│   │   ├── dashboard/
│   │   │   ├── admin/               # Admin panel
│   │   │   │   ├── page.tsx
│   │   │   │   └── ticket/[id]/
│   │   │   ├── agent/               # Agent portal
│   │   │   │   ├── page.tsx
│   │   │   │   └── ticket/[id]/
│   │   │   └── requester/           # Customer portal
│   │   │       ├── page.tsx
│   │   │       └── ticket/[id]/
│   │   ├── layout.tsx
│   │   └── page.tsx                 # Login page
│   │
│   ├── components/
│   │   ├── ChatUI.tsx               # Chat message bubbles
│   │   └── AIMetricsModal.tsx       # AI metrics dashboard
│   │
│   └── lib/
│       ├── ai-agents/               # Modular AI agent definitions
│       │   ├── index.ts
│       │   ├── system-prompt.ts
│       │   ├── tool-definitions.ts
│       │   ├── triage-agent.ts
│       │   ├── info-agent.ts
│       │   ├── catalog-agent.ts
│       │   ├── admission-agent.ts
│       │   ├── order-agent.ts
│       │   └── party-agent.ts
│       ├── api.ts                   # Role-based data access
│       ├── supabase.ts              # Database client & types
│       ├── auth-context.tsx         # Authentication state
│       ├── useRealtime.ts           # WebSocket subscriptions
│       └── useNotificationSound.ts  # New message alerts
│
├── public/
│   └── sounds/
│       └── notification.mp3
│
├── .env.local                       # Environment variables
├── next.config.mjs                  # Next.js config (basePath: /tms)
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 🔧 API Endpoints

### AI Resolution (`/api/ai-resolve`)

**POST** - Process ticket with AI

```typescript
// Assign AI bot to ticket
{ action: 'assign', ticketId: number }

// Get AI response to message
{ action: 'respond', ticketId: number, userMessage: string }
```

### AI Metrics (`/api/ai-metrics`)

**GET** - Retrieve AI performance metrics

Returns:
- Summary stats (resolution rate, time saved, cost savings)
- Daily trend data (30 days)
- Organization preference breakdown
- Priority breakdown

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Client companies |
| `contacts` | End users (requesters) |
| `locations` | Sites with location_type |
| `support_tickets` | Tickets with status/priority |
| `ticket_messages` | Conversation history |
| `ticket_assignments` | Agent assignments |
| `support_agents` | Bot and Human agents |
| `ticket_statuses` | Status lookup |
| `ticket_priorities` | Priority lookup |

### Key Ticket Fields

```typescript
interface SupportTicket {
  ticket_id: number;
  subject: string;
  description: string;
  status_id: number;        // 1=Open, 5=Resolved, 6=Closed
  priority_id: number;      // 1=Low, 4=Critical
  requires_human_agent: boolean;  // Human-only flag
  contact_id: number;
  organization_id: number;
}
```

## 🤖 AI Agents

The chat system uses the same multi-agent architecture as the voice system:

| Agent | Trigger | Purpose |
|-------|---------|---------|
| **Triage** | Always first | Route to specialists, detect urgency |
| **Info** | Company info requests | Hours, policies, contacts |
| **Catalog** | Product questions | Search, pricing, specs |
| **Admission** | Ticket policies | Explain support tiers |
| **Order** | Order tracking | Status, history |

## �� Human Handoff Flow

1. **Detection**: AI detects "talk to human", "escalate", etc.
2. **Confirmation**: AI asks "Would you like me to transfer you?"
3. **User confirms**: "yes"
4. **Assignment**: Random available human agent assigned
5. **Notification**: "Alex Martinez has been assigned to help you"
6. **Context**: Agent sees full conversation history

### Special Cases

- **Data Center Tickets**: Automatically go to human (no AI)
- **Explicit Escalation**: Skip confirmation if clearly urgent
- **No Agents Available**: AI continues, notes escalation needed

## 📊 AI Metrics

Access via Admin Dashboard → "AI Metrics" button

### Summary Metrics
- Total tickets processed
- AI vs Human resolution counts
- AI resolution rate %
- Hours saved by AI
- Cost savings (at $25/hr)
- Average response times

### Charts
- 30-day resolution trend (AI vs Human daily)
- Priority breakdown (which priorities AI handles)
- Organization preference (which orgs need more human help)
- Response time comparison

## 🔐 Authentication

Currently uses demo/hardcoded users. For production, implement:
- Supabase Auth
- JWT tokens
- Role-based middleware

## 📱 Responsive Design

- Desktop: Full sidebar and detail views
- Tablet: Collapsible navigation
- Mobile: Stack layout with bottom nav

## 🎨 UI Components

### ChatUI
- Message bubbles with avatar icons
- Bot messages with purple accent
- Human messages with green/blue
- Markdown bold text support
- "AI is thinking" spinner

### AIMetricsModal
- Circular progress charts
- Bar charts for comparisons
- Trend line charts
- Responsive grid layout

## �� Configuration

### next.config.mjs

```javascript
const nextConfig = {
  basePath: '/tms',
  output: 'standalone',
};
```

### Nginx (Production)

```nginx
location /tms {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## 📝 License

Proprietary - U Rack IT / CallSphere Technologies
