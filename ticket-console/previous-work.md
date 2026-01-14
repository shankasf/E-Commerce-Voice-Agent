# Previous Work - System Architecture & Integration

## Overview
This document describes the complete architecture and data flow between the Next.js frontend, Python AI service, and Windows native application.

---

## 1. System Components

### A. Next.js Web Application (Port 3001)
**Location**: `E-Commerce-Voice-Agent/ticket-console/`

**Three User Portals**:
- **Requester Portal** (`/dashboard/requester`) - End users submit tickets
- **Agent Portal** (`/dashboard/agent`) - Support agents manage tickets
- **Admin Portal** (`/dashboard/admin`) - System administrators

**Key Features**:
- Ticket management (CRUD operations)
- Real-time chat with AI assistant
- Device authentication and registration
- Session management
- Floating chat widget in all portals

### B. Python AI Service (Port 8081)
**Location**: `sunil-console/ai-service/`

**Framework**: FastAPI with OpenAI integration

**Key Features**:
- Multi-agent AI system (triage, device, ticket, network, etc.)
- Conversation memory management
- 30+ database function tools
- WebSocket support for real-time chat
- Voice integration (Twilio/WebRTC)
- ChromaDB knowledge base

### C. Windows Native Application
**Purpose**: Device-side monitoring and control

**Integration Points**:
- Authenticates via device serial number + U&E code
- Receives 6-digit pairing codes
- Establishes WebSocket connection to Python AI service
- Reports device status and metrics

---

## 2. Authentication Flows

### A. Device Authentication (Windows App → Next.js)

```
Windows App
  ↓
POST /api/client-application/device/auth
  {
    ue_code: "3450",
    serial_number: "SN123456"
  }
  ↓
Next.js validates:
  - Organization exists (by U&E code)
  - Device exists (by serial_no)
  - Device owner (from contact_devices table)
  ↓
Response: JWT token (24-hour expiry)
  {
    jwt_token: "...",
    device_id: 123,
    user_id: 456,
    organization_id: 789,
    expires_at: "..."
  }
```

**Token Renewal**: `POST /api/client-application/device/refresh-token`
- Same validation process
- Generates fresh 24-hour JWT

### B. Web Authentication (Browser → Next.js)

**Current**: Demo login (localStorage-based)
- Admin: Hardcoded credentials
- Agent: Hardcoded credentials
- Requester: Phone number lookup

**User Object** (stored in localStorage):
```json
{
  "role": "agent",
  "id": 2,
  "name": "Alex Support",
  "email": "alex@urackit.com"
}
```

---

## 3. Device Connection Flow (Windows App ↔ Python AI)

### Step 1: Create Device Connection (Python → Next.js)

```
Python AI Service
  ↓
POST /api/client-application/device-connections/create
Headers:
  X-AI-Service-Key: <secret>
  X-Forwarded-For: 127.0.0.1
Body:
  {
    user_id: 123,
    organization_id: 456,
    device_id: 789,
    session_token: "web-session-xyz"
  }
  ↓
Next.js validates:
  - API key matches
  - IP is whitelisted
  - Web session is active
  - User owns device
  ↓
Generates:
  - 6-digit alphanumeric code (e.g., "A3X9K2")
  - WebSocket URL (e.g., "ws://ai.internal.example.com/device/abc123")
  - Session UUID
  ↓
Response:
  {
    success: true,
    code: "A3X9K2",
    session_id: "abc-123-def",
    websocket_url: "ws://...",
    expires_in_seconds: 300
  }
```

### Step 2: Device Connects (Windows App → Python AI)

```
Windows App
  ↓
User enters 6-digit code: "A3X9K2"
  ↓
Windows App establishes WebSocket:
  ws://ai.internal.example.com/device/abc-123-def
  ↓
Python AI Service:
  - Validates session_id
  - Updates device_connections.is_active = TRUE
  - Starts streaming communication
```

**Important**: `is_active` flag
- **FALSE**: When Next.js creates the pairing record
- **TRUE**: When Python establishes actual WebSocket connection

---

## 4. Chat Integration Flow

### A. User Sends Message (Browser → Next.js → Python AI)

```
User types in ChatWindow component
  ↓
Frontend generates JWT-like token:
  btoa(JSON.stringify({
    userId: 123,
    role: "agent",
    email: "user@example.com",
    name: "User Name"
  }))
  ↓
POST /api/chat/message
Headers:
  Authorization: Bearer <token>
Body:
  {
    message: "Show me open tickets",
    sessionId: "chat-123-456" (optional)
  }
  ↓
Next.js /api/chat/message route:
  1. Validates JWT token
  2. Extracts user context (userId, role, org)
  3. Builds role-specific context:
     - Requester: contactId, deviceId, maxPermissions: "read_own_tickets"
     - Agent: agentId, specialization, maxPermissions: "manage_assigned_tickets"
     - Admin: maxPermissions: "full_access"
  4. Forwards to Python AI service
  ↓
POST http://localhost:8081/api/chat
Headers:
  X-AI-Service-Key: <secret>
Body:
  {
    message: "Show me open tickets",
    session_id: "chat-123-456",
    context: {
      userId: 123,
      userRole: "agent",
      organizationId: 456,
      maxPermissions: "manage_assigned_tickets"
    }
  }
  ↓
Python AI Service:
  1. Loads conversation memory for session_id
  2. Merges context into system prompt
  3. Runs agent pipeline (triage → specialist agents)
  4. Executes database tools (e.g., get_tickets_by_contact)
  5. Returns AI response
  ↓
Response to Next.js:
  {
    response: "Here are the open tickets...",
    session_id: "chat-123-456",
    agent_name: "URackIT_TriageAgent",
    tool_calls: [
      {function: {name: "get_tickets_by_contact", arguments: "..."}}
    ]
  }
  ↓
Next.js forwards to frontend
  ↓
ChatWindow displays AI response
```

### B. Role-Based Context Examples

**Requester Context**:
```json
{
  "userId": 123,
  "userRole": "requester",
  "organizationId": 456,
  "contactId": 123,
  "deviceId": 789,
  "maxPermissions": "read_own_tickets"
}
```
- AI can only query their own tickets
- AI can create tickets for their devices
- Cannot access other users' data

**Agent Context**:
```json
{
  "userId": 456,
  "userRole": "agent",
  "organizationId": 456,
  "agentId": 10,
  "specialization": "Network Support",
  "maxPermissions": "manage_assigned_tickets"
}
```
- AI can view all tickets in queue
- AI can claim and update tickets
- AI has troubleshooting tools

**Admin Context**:
```json
{
  "userId": 789,
  "userRole": "admin",
  "organizationId": 456,
  "maxPermissions": "full_access"
}
```
- AI has full access to all data
- Can create/modify organizations
- No restrictions

---

## 5. Database Schema (Supabase PostgreSQL)

### Core Tables

**organizations**
- `organization_id` (PK)
- `name`, `u_e_code`, `manager_id`

**contacts**
- `contact_id` (PK)
- `organization_id` (FK)
- `full_name`, `email`, `phone`

**devices**
- `device_id` (PK)
- `organization_id` (FK), `location_id` (FK)
- `asset_name`, `serial_no`, `status`

**contact_devices** (junction table)
- `contact_id` (FK), `device_id` (FK)
- `assigned_at`, `unassigned_at`

**support_tickets**
- `ticket_id` (PK)
- `organization_id` (FK), `contact_id` (FK), `device_id` (FK)
- `subject`, `description`, `status_id`, `priority_id`
- `requires_human_agent`

**device_connections**
- `connection_id` (PK)
- `device_id` (FK), `user_id` (FK), `organization_id` (FK)
- `session_id` (UUID)
- `six_digit_code` (VARCHAR(6))
- `connection_url` (WebSocket URL)
- `is_active` (BOOLEAN)
- `connected_at`, `disconnected_at`

**sessions** (planned, not yet created)
- `session_id` (UUID PK)
- `session_token` (TEXT)
- `user_id` (FK), `organization_id` (FK)
- `is_active`, `expires_at`

---

## 6. API Endpoints Summary

### Next.js Backend (`localhost:3001`)

**Device Authentication**:
- `POST /api/client-application/device/auth` - Device login (JWT)
- `POST /api/client-application/device/refresh-token` - Renew JWT

**Device Connections**:
- `POST /api/client-application/device-connections/create` - Generate pairing code
  - Auth: API key + IP whitelist
  - Called by Python AI service

**Chat**:
- `POST /api/chat/message` - Send message to AI
  - Auth: JWT token (web user)
  - Forwards to Python AI service

**Contact Management**:
- `POST /api/auth/validate-ue-code` - Validate U&E code
- `POST /api/auth/create-contact` - Register new contact

### Python AI Service (`localhost:8081`)

**Chat**:
- `POST /api/chat` - Main chat endpoint (used by Next.js)
- `POST /api/chat/start` - Start new session
- `WebSocket /ws/chat/{session_id}` - Real-time chat

**Session Management**:
- `POST /api/session/context` - Set session context
- `GET /api/session/{session_id}` - Get session info
- `DELETE /api/session/{session_id}` - Clear session

**AI Tasks**:
- `POST /api/summarize` - Summarize call transcripts
- `POST /api/classify` - Classify IT issues

**Knowledge Base**:
- `GET /api/knowledge/stats` - ChromaDB stats
- `POST /api/knowledge/search` - Semantic search

**Voice/WebRTC**:
- `POST /webrtc/connect` - Establish WebRTC session
- `POST /twilio` - Twilio webhook
- `WebSocket /media-stream/{session_id}` - Twilio media stream

---

## 7. Environment Variables

### Next.js (`.env`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zdciritnjaeadbksghko.supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_publishable_...

# JWT
JWT_SECRET=urackit-device-auth-secret-change-in-production-2024

# AI Service Integration
AI_SERVICE_URL=http://localhost:8081
AI_SERVICE_API_KEY=your-super-secret-ai-service-key-change-in-production
AI_SERVICE_ALLOWED_IPS=127.0.0.1,::1
WS_BASE_URL=ai.internal.example.com
```

### Python AI Service (`.env`)
```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Database
SUPABASE_URL=https://zdciritnjaeadbksghko.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
# OR
DATABASE_URL=postgresql://user:pass@host:5432/db

# Server
HOST=0.0.0.0
PORT=8081
DEBUG=false
```

---

## 8. Key Files Modified/Created

### Created Files

**Next.js**:
- `src/app/api/chat/message/route.ts` - Chat API route
- `src/lib/auth-utils.ts` - JWT utilities
- `src/components/ChatWidget.tsx` - Floating chat widget
- `src/app/dashboard/requester/chat/page.tsx` - Requester chat page
- `src/app/dashboard/admin/chat/page.tsx` - Admin chat page
- `CHAT_INTEGRATION.md` - Chat integration docs
- `previous-work.md` - This document

### Modified Files

**Next.js**:
- `src/components/ChatWindow.tsx` - Added API integration
- `src/app/dashboard/requester/page.tsx` - Added ChatWidget
- `src/app/dashboard/admin/page.tsx` - Added ChatWidget + removed modal
- `src/lib/supabase.ts` - **Fixed**: Removed `dotenv` import (caused browser error)
- `.env` + `.env.example` - Added AI_SERVICE_URL

**Python AI Service**:
- No changes required (already has `/api/chat` endpoint)

---

## 9. Application Flow Diagrams

### Complete System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (User)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │Requester │  │  Agent   │  │  Admin   │                  │
│  │ Portal   │  │  Portal  │  │  Portal  │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       └─────────────┴─────────────┘                         │
│                     │                                        │
│              ChatWindow.tsx                                  │
│                     │                                        │
└─────────────────────┼──────────────────────────────────────┘
                      │
                      │ HTTP POST (JWT token)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS BACKEND (Port 3001)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /api/chat/message                                     │  │
│  │  - Validate JWT                                       │  │
│  │  - Extract user context (role, userId, orgId)        │  │
│  │  - Build role-specific context                       │  │
│  │  - Forward to Python AI                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /api/client-application/device/auth                   │  │
│  │  - Validate U&E code + serial number                 │  │
│  │  - Return JWT for device                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ /api/client-application/device-connections/create     │  │
│  │  - Validate API key + IP                             │  │
│  │  - Generate 6-digit pairing code                     │  │
│  │  - Return WebSocket URL                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────┬────────────────────────┬──────────────────┘
                  │                        │
        (API Key) │                        │ (Direct query)
                  ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│            PYTHON AI SERVICE (Port 8081)                     │
│                                                              │
│  POST /api/chat                                             │
│  - Load conversation memory                                 │
│  - Apply role-based context                                │
│  - Run agent pipeline                                      │
│  - Execute database tools                                  │
│  - Return AI response                                      │
│                                                              │
│  WebSocket /device/{session_id}                            │
│  - Accept Windows app connections                          │
│  - Real-time communication                                 │
│                                                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ (Supabase API)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 SUPABASE DATABASE (PostgreSQL)               │
│                                                              │
│  Tables: organizations, contacts, devices,                  │
│          support_tickets, device_connections, sessions      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │
                          │ (WebSocket)
                          │
┌─────────────────────────────────────────────────────────────┐
│                WINDOWS NATIVE APPLICATION                    │
│                                                              │
│  1. Authenticate with Next.js (get JWT)                     │
│  2. Request pairing code                                    │
│  3. Connect to Python AI via WebSocket                      │
│  4. Stream device metrics                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Device Pairing Flow

```
User Opens Windows App
  ↓
Enter U&E Code + Serial Number
  ↓
POST /api/client-application/device/auth
  ↓
Receive JWT Token (24-hour)
  ↓
User Opens Web Portal (Requester)
  ↓
Login creates active session
  ↓
User Clicks "Pair Device" in Portal
  ↓
Web Portal calls Python AI Service
  ↓
Python calls Next.js:
  POST /api/client-application/device-connections/create
  ↓
Next.js generates:
  - 6-digit code: "A3X9K2"
  - session_id: "abc-123"
  - websocket_url: "ws://ai.internal/device/abc-123"
  - Creates DB record: is_active = FALSE
  ↓
Display code on web portal: "Enter A3X9K2 in your app"
  ↓
User enters code in Windows App
  ↓
Windows App connects:
  WebSocket ws://ai.internal/device/abc-123
  ↓
Python AI validates session_id
  ↓
Updates DB: is_active = TRUE
  ↓
Connection Established
  ↓
Bi-directional communication begins
```

---

## 10. Security Architecture

### Multi-Layer Security

**Layer 1: Client → Next.js**
- JWT token in Authorization header
- Validates signature using `JWT_SECRET`
- Extracts user context (role, userId, org)

**Layer 2: Next.js → Python AI**
- API Key in `X-AI-Service-Key` header
- IP whitelist validation
- Service-to-service authentication

**Layer 3: Python AI → Database**
- Supabase service role key
- Organization-scoped queries (where `organization_id = X`)
- Role-based tool filtering (planned)

### Current Security State

✅ **Implemented**:
- JWT validation in Next.js
- Role extraction and context building
- API key authentication (Next.js → Python)
- Device authentication with JWT
- Organization isolation in database queries

⚠️ **Pending**:
- API key validation in Python service
- IP whitelist enforcement in Python
- Rate limiting
- Audit logging
- Session persistence (Redis/DB)

---

## 11. Testing Checklist

### Device Authentication
- [ ] Windows app can authenticate with valid U&E code + serial number
- [ ] Invalid U&E code returns 400 error
- [ ] Invalid serial number returns 400 error
- [ ] JWT token includes device_id, user_id, organization_id
- [ ] Token refresh works before expiry

### Device Pairing
- [ ] Python AI can create device connection (valid API key)
- [ ] Invalid API key returns 401
- [ ] 6-digit code is generated (uppercase alphanumeric)
- [ ] WebSocket URL is returned
- [ ] is_active is FALSE initially
- [ ] Windows app can connect via WebSocket
- [ ] is_active updates to TRUE on connection

### Web Chat (Requester)
- [ ] Floating chat icon appears
- [ ] Chat window opens on click
- [ ] Can send messages
- [ ] AI responds with context awareness
- [ ] Can only see own tickets
- [ ] Session persists across messages

### Web Chat (Agent)
- [ ] Chat icon appears
- [ ] Can query all tickets in queue
- [ ] Can claim tickets
- [ ] Specialization included in context
- [ ] Tools available: ticket updates, escalation

### Web Chat (Admin)
- [ ] Chat icon appears
- [ ] Full access to all data
- [ ] Can create organizations
- [ ] Can manage users
- [ ] No permission restrictions

---

## 12. Troubleshooting

### Blank white screen in any dashboard
**Cause**: Node.js-specific imports in client-side code
**Fix**: Remove `import dotenv` and `dotenv.config()` from files imported by browser (already fixed in `src/lib/supabase.ts`)

### "Unauthorized - No token provided"
**Cause**: User not logged in or JWT not generated
**Solution**: Check localStorage for `urackit_user`, verify token generation in ChatWindow

### "AI service error: Connection refused"
**Cause**: Python AI service not running
**Solution**: `cd sunil-console/ai-service && python main.py`

### Device authentication fails
**Cause**: Serial number column mismatch
**Note**: Database column is `serial_no`, API uses `serial_number` (already mapped in code)

### Chat responses are generic
**Cause**: Context not being passed correctly
**Solution**: Check browser console for `[Chat API] Request` logs, verify context object

---

## 13. Next Steps (Recommendations)

### High Priority
1. **Implement sessions table** in database
2. **Add API key validation** in Python service
3. **Add rate limiting** in Next.js API routes
4. **Implement audit logging** for all AI interactions

### Medium Priority
5. **WebSocket chat integration** for real-time streaming
6. **Persistent chat sessions** (resume conversations)
7. **Role-based tool filtering** in Python agent pipeline
8. **Organization-scoped queries** enforcement

### Low Priority
9. **Token refresh mechanism** (refresh tokens)
10. **Error boundaries** in React components
11. **Analytics dashboard** for chat metrics
12. **User feedback** (thumbs up/down on AI responses)

---

## End of Document

**Last Updated**: January 2026
**System Version**: Next.js 14.2, Python FastAPI 0.115.6
**Database**: Supabase PostgreSQL
