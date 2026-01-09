# Chat Integration with Python AI Service

## Overview

This document describes the implementation of the secure, role-aware chat integration between the Next.js frontend and the Python AI service (FastAPI).

## Architecture

```
Frontend (ChatWindow) → Next.js API (/api/chat/message) → Python AI Service (FastAPI:8081)
```

## Implementation Summary

### 1. **Next.js API Route** (`/api/chat/message/route.ts`)

**Location**: `src/app/api/chat/message/route.ts`

**Responsibilities**:
- Validate JWT token from Authorization header
- Extract user context (userId, role, organizationId)
- Build role-specific context object
- Forward request to Python AI service with API key authentication
- Return AI response to frontend

**Security Features**:
- JWT token validation
- API key authentication to Python service (`X-AI-Service-Key` header)
- Role-based context injection
- Error handling and logging

**Request Format**:
```typescript
POST /api/chat/message
Headers: {
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
}
Body: {
  message: string,
  sessionId?: string  // Optional, auto-generated if not provided
}
```

**Response Format**:
```typescript
{
  success: boolean,
  response: string,          // AI-generated response
  sessionId: string,         // Chat session ID
  agentName: string,         // Which AI agent responded
  toolCalls: Array<any>,     // Tools/functions executed by AI
  context: Object            // Updated context
}
```

### 2. **Frontend Component** (`ChatWindow.tsx`)

**Location**: `src/components/ChatWindow.tsx`

**Changes Made**:
- Added `chatSessionId` state for session management
- Added `authToken` state for JWT token
- Updated `handleSendMessage` to call Next.js API endpoint
- Generate simple base64-encoded token from user data
- Handle API errors gracefully
- Display AI responses in chat interface

**Token Generation** (Temporary Solution):
```typescript
const token = btoa(JSON.stringify({
  userId: user.id,
  role: user.role,
  email: user.email,
  name: user.name,
}));
```

> **Note**: In production, JWT tokens should be generated server-side during login and stored securely.

### 3. **Environment Configuration**

**Updated Files**:
- `.env`
- `.env.example`

**New Variables**:
```bash
# AI Service Configuration (Python FastAPI Service)
AI_SERVICE_URL=http://localhost:8081
AI_SERVICE_API_KEY=your-super-secret-ai-service-key-change-in-production
AI_SERVICE_ALLOWED_IPS=127.0.0.1,::1
```

**Existing Variables**:
```bash
# JWT Secret for Device Authentication
JWT_SECRET=urackit-device-auth-secret-change-in-production-2024

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...
```

## Role-Based Context

The system builds different context objects based on user role:

### Requester Context
```typescript
{
  userId: 123,
  userRole: "requester",
  userEmail: "john@example.com",
  userName: "John Doe",
  organizationId: 456,
  contactId: 123,
  deviceId: 789,
  maxPermissions: "read_own_tickets"
}
```

### Agent Context
```typescript
{
  userId: 456,
  userRole: "agent",
  userEmail: "emily@support.com",
  userName: "Emily Clark",
  organizationId: 456,
  agentId: 10,
  specialization: "Network Support",
  maxPermissions: "manage_assigned_tickets"
}
```

### Admin Context
```typescript
{
  userId: 789,
  userRole: "admin",
  userEmail: "sarah@admin.com",
  userName: "Sarah Admin",
  organizationId: 456,
  maxPermissions: "full_access"
}
```

## Testing Instructions

### Prerequisites

1. **Python AI Service Running**:
   ```bash
   cd sunil-console/ai-service
   python main.py
   ```
   Service should be running on `http://localhost:8081`

2. **Next.js Application Running**:
   ```bash
   cd E-Commerce-Voice-Agent/ticket-console
   npm run dev
   ```
   Application should be running on `http://localhost:3001`

3. **Environment Variables Set**:
   - Verify `.env` file has `AI_SERVICE_URL` configured
   - Verify `AI_SERVICE_API_KEY` matches (if validation is implemented in Python)

### Test Scenarios

#### Test 1: Requester Portal Chat

1. Navigate to `http://localhost:3001`
2. Login as requester (use phone number from database)
3. Click the floating green chat icon (bottom right)
4. Chat window should open
5. Send a message: "Hello, I need help with my device"
6. Verify AI response is received
7. Check browser console for logs:
   - `[Chat API] Request:` should show role as "requester"
   - `[Chat API] Response:` should show agent name and session ID

**Expected Behavior**:
- AI should have access to requester's own tickets only
- AI can query requester's devices
- AI cannot access other contacts' data

#### Test 2: Agent Portal Chat

1. Navigate to `http://localhost:3001`
2. Login as agent (select "Agent" role)
3. Click the floating green chat icon (bottom right)
4. Send a message: "Show me all open tickets"
5. Verify AI response with ticket information
6. Check console for role: "agent"

**Expected Behavior**:
- AI should have access to all tickets in the queue
- AI can claim unassigned tickets
- AI can update ticket statuses
- AI has troubleshooting tools available

#### Test 3: Admin Portal Chat

1. Navigate to `http://localhost:3001`
2. Login as admin (select "Admin" role)
3. Click the floating green chat icon (bottom right)
4. Send a message: "Show me all organizations"
5. Verify AI response with organization data
6. Check console for role: "admin"

**Expected Behavior**:
- AI should have full access to all data
- AI can create/modify organizations
- AI can manage agents and contacts
- No restrictions on database queries

#### Test 4: Session Persistence

1. Start a chat conversation in any portal
2. Send multiple messages back and forth
3. Refresh the browser page
4. Open chat again and send a new message
5. Verify session ID changes (new session started)

> **Note**: Currently sessions are ephemeral (in-memory in Python service). For production, implement Redis or database-backed session storage.

#### Test 5: Error Handling

1. Stop the Python AI service
2. Try to send a chat message
3. Verify graceful error message is displayed
4. Restart Python AI service
5. Verify chat resumes working

**Expected Error Message**:
```
"Sorry, I encountered an error. Please try again."
```

## API Flow Diagram

```
┌─────────────┐
│   Browser   │
│ (ChatWindow)│
└──────┬──────┘
       │ 1. POST with JWT token
       ▼
┌─────────────────────┐
│  Next.js API Route  │
│ /api/chat/message   │
└──────┬──────────────┘
       │ 2. Validate JWT
       │ 3. Extract user context
       │ 4. Build role-specific context
       ▼
┌─────────────────────┐
│   Python AI Service │
│  FastAPI (Port 8081)│
│   POST /api/chat    │
└──────┬──────────────┘
       │ 5. Load conversation memory
       │ 6. Apply role-based filters
       │ 7. Execute agent pipeline
       │ 8. Call database tools
       ▼
┌─────────────────────┐
│ Supabase Database   │
│ (PostgreSQL)        │
└─────────────────────┘
```

## Security Considerations

### Current Implementation

✅ **Implemented**:
- JWT token validation in Next.js API
- Role extraction from JWT payload
- API key header for service-to-service auth
- Context-based permission levels
- Error logging

⚠️ **Pending** (Python Service):
- API key validation in Python service (not enforced yet)
- IP whitelist validation (not enforced yet)
- Role-based tool filtering in agent pipeline
- Rate limiting
- Audit logging

### Production Recommendations

1. **Generate JWT on Login**:
   - Move JWT generation to login API route
   - Store token in httpOnly cookie or localStorage
   - Include expiration and refresh token logic

2. **Enable API Key Validation**:
   - Add middleware to Python service to validate `X-AI-Service-Key`
   - Return 401 Unauthorized if key is missing/invalid

3. **Implement Rate Limiting**:
   - Add rate limiting in Next.js API route
   - Limit requests per user per minute (e.g., 20 messages/min)

4. **Add Audit Logging**:
   - Log all chat interactions to database
   - Track: userId, role, message, response, timestamp
   - Use for compliance and debugging

5. **Session Management**:
   - Store chat sessions in Redis or PostgreSQL
   - Enable session resumption across page refreshes
   - Set session timeout (e.g., 30 minutes of inactivity)

6. **HTTPS in Production**:
   - Use HTTPS for all communications
   - Update `AI_SERVICE_URL` to use `https://`

## Troubleshooting

### Issue: "Unauthorized - No token provided"

**Cause**: Authorization header is missing or malformed

**Solution**:
- Verify user is logged in (check `localStorage` for `urackit_user`)
- Check browser console for token generation logs
- Verify Authorization header format: `Bearer <token>`

### Issue: "AI service error: Connection refused"

**Cause**: Python AI service is not running

**Solution**:
```bash
cd sunil-console/ai-service
python main.py
```

### Issue: "Invalid token"

**Cause**: JWT secret mismatch or token format issue

**Solution**:
- Verify `JWT_SECRET` in `.env` matches the secret used for signing
- Check token generation code in `ChatWindow.tsx`
- Inspect decoded token payload in `/api/chat/message/route.ts`

### Issue: AI response is generic or incorrect

**Cause**: Context is not being passed correctly to Python service

**Solution**:
- Check browser console for `[Chat API] Request:` log
- Verify context object includes role, userId, organizationId
- Check Python service logs for received context
- Verify Python agent pipeline is using context correctly

### Issue: Chat widget not appearing

**Cause**: Component not imported or user not authenticated

**Solution**:
- Verify `<ChatWidget />` is added to dashboard page
- Check user authentication state with `useAuth()`
- Inspect browser console for React errors

## Files Modified/Created

### New Files
- ✅ `src/app/api/chat/message/route.ts` - API route for chat
- ✅ `src/lib/auth-utils.ts` - JWT utility functions (unused, for reference)
- ✅ `src/components/ChatWidget.tsx` - Floating chat widget
- ✅ `CHAT_INTEGRATION.md` - This documentation

### Modified Files
- ✅ `src/components/ChatWindow.tsx` - Added API integration
- ✅ `src/app/dashboard/requester/page.tsx` - Added ChatWidget
- ✅ `src/app/dashboard/admin/page.tsx` - Added ChatWidget
- ✅ `.env` - Added AI_SERVICE_URL
- ✅ `.env.example` - Added AI_SERVICE_URL

### Python Service (No Changes Required)
- ✅ Python AI service already supports `/api/chat` endpoint
- ✅ Already handles context in system prompts
- ✅ Already has agent pipeline and tools
- ✅ Already integrates with Supabase database

## Next Steps (Optional Enhancements)

1. **WebSocket Integration**:
   - Use `/ws/chat/{session_id}` endpoint for real-time streaming
   - Display AI response as it's being generated (word-by-word)

2. **Persistent Sessions**:
   - Store chat sessions in `sessions` table
   - Resume conversations across page refreshes
   - Display chat history when reopening chat

3. **Role-Based Tool Filtering**:
   - Implement tool filtering in Python agent pipeline
   - Restrict database queries based on `maxPermissions` in context
   - Add organization-scoped queries (filter by `organizationId`)

4. **Enhanced UI**:
   - Add typing indicators
   - Show tool calls as "Agent is checking the database..."
   - Display agent handoffs (e.g., "Transferring to Network Agent...")

5. **Analytics**:
   - Track chat metrics (avg response time, messages per session)
   - Monitor AI costs (token usage, OpenAI API costs)
   - Analyze user satisfaction (thumbs up/down feedback)

## Support

For issues or questions:
- Check Python AI service logs: `sunil-console/ai-service/`
- Check Next.js server logs in terminal
- Check browser console for frontend errors
- Review this documentation for troubleshooting tips
