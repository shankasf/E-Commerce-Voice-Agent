# U Rack IT Ticket Management Console

A TypeScript/Next.js web console for managing IT support tickets. Works with the same Supabase database as the voice AI system.

## Features

### Three Login Roles (Demo/Hardcoded)

1. **Requester** (End Users)
   - View only their own tickets
   - Create new support tickets
   - Add messages to their tickets
   - Track ticket status

2. **Admin** (Full Access)
   - View all tickets across all organizations
   - Manage organizations, contacts, and agents
   - Assign tickets to human agents
   - Update any ticket status
   - View dashboard stats

3. **Human Agent** (Support Staff)
   - View assigned tickets
   - View escalated tickets (can claim)
   - View tickets requiring human attention
   - Add messages and resolve tickets
   - Toggle availability status

## Role-Based Access Control

| Feature | Requester | Admin | Agent |
|---------|-----------|-------|-------|
| View own tickets | ✅ | ✅ | - |
| View all tickets | ❌ | ✅ | ❌ |
| View assigned tickets | - | ✅ | ✅ |
| View escalated tickets | ❌ | ✅ | ✅ |
| Create tickets | ✅ | ✅ | ❌ |
| Update ticket status | ❌ | ✅ | ✅ (own) |
| Assign tickets | ❌ | ✅ | ❌ |
| Claim tickets | ❌ | ❌ | ✅ |
| Manage organizations | ❌ | ✅ | ❌ |
| Manage contacts | ❌ | ✅ | ❌ |
| Manage agents | ❌ | ✅ | ❌ |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React

## Setup

1. Install dependencies:
```bash
cd ticket-console
npm install
```

2. Configure environment:
```bash
# .env.local is already configured with Supabase credentials
```

3. Run development server:
```bash
npm run dev
```

4. Open http://localhost:3001

## Database Schema

Uses the `ticket_management_schema.sql` with tables:
- `organizations` - Companies/clients
- `contacts` - End users linked to organizations
- `support_tickets` - Support tickets with status/priority
- `ticket_messages` - Conversation history
- `ticket_assignments` - Agent-ticket assignments
- `ticket_escalations` - Escalation records
- `support_agents` - Bot and human agents
- `ticket_statuses` - Status lookup (Open, In Progress, etc.)
- `ticket_priorities` - Priority lookup (Low, Medium, High, Critical)
- `devices` - Managed devices
- `locations` - Organization locations

## Integration with Voice AI

Both the voice system and this web console access the same Supabase database:
- Voice AI creates tickets, contacts, and messages
- Web console allows viewing and managing those tickets
- Human agents can handle escalated tickets from voice calls
- Ticket messages show both bot and human responses

## Project Structure

```
ticket-console/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with AuthProvider
│   │   ├── page.tsx            # Login page (3 role options)
│   │   ├── globals.css         # Tailwind styles
│   │   └── dashboard/
│   │       ├── requester/      # Requester dashboard + ticket detail
│   │       ├── admin/          # Admin dashboard + ticket detail
│   │       └── agent/          # Agent dashboard + ticket detail
│   └── lib/
│       ├── supabase.ts         # Supabase client + types
│       ├── auth-context.tsx    # Auth context with demo users
│       └── api.ts              # Role-based API functions
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```
