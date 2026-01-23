import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { aiServiceFetch } from '@/lib/ai-service-client';

const JWT_SECRET = process.env.JWT_SECRET;

interface JWTPayload {
  userId?: number;
  user_id?: number;
  role?: string;
  userRole?: string;
  email?: string;
  user_email?: string;
  name?: string;
  user_name?: string;
  organizationId?: number;
  organization_id?: number;
  contactId?: number;
  contact_id?: number;
  deviceId?: number;
  device_id?: number;
  agentId?: number;
  support_agent_id?: number;
  specialization?: string;
}

interface ChatContext {
  userId: number | null;
  userRole: string;
  userEmail: string | null;
  userName: string | null;
  organizationId: number | null;
  contactId?: number | null;
  deviceId?: number | null;
  agentId?: number | null;
  specialization?: string | null;
  maxPermissions: string;
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Extract and validate JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userPayload: JWTPayload;

    try {
      // Try JWT verification first
      userPayload = jwt.verify(token, JWT_SECRET!) as JWTPayload;
    } catch (jwtErr) {
      // Fallback: try base64 decoding (for browser-generated tokens)
      try {
        const decoded = atob(token);
        userPayload = JSON.parse(decoded) as JWTPayload;
      } catch (decodeErr) {
        console.error('[Chat Start API] Token verification failed:', jwtErr);
        return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
      }
    }

    // Step 2: Build context based on role
    const context = buildContextForRole(userPayload);

    console.log('[Chat Start API] Request:', {
      userId: context.userId,
      role: context.userRole,
    });

    // Step 3: Forward to Python AI service to start session
    const aiResponse = await aiServiceFetch('/api/chat/start', {
      method: 'POST',
      body: JSON.stringify({
        context,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Chat Start API] AI service error:', errorText);
      throw new Error(`AI service error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();

    console.log('[Chat Start API] Session created:', {
      sessionId: aiData.session_id,
    });

    // Step 4: Return session info to frontend
    return NextResponse.json({
      success: true,
      sessionId: aiData.session_id,
      greeting: aiData.greeting || "Hello! I'm your AI assistant. How can I help you today?",
      agentName: aiData.agent_name || 'Triage Agent',
      context: aiData.context,
    });

  } catch (error: any) {
    console.error('[Chat Start API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

function buildContextForRole(userPayload: JWTPayload): ChatContext {
  // Extract user info with fallbacks for different JWT formats
  const userId = userPayload.userId || userPayload.user_id || null;
  const userRole = userPayload.role || userPayload.userRole || 'requester';
  const userEmail = userPayload.email || userPayload.user_email || null;
  const userName = userPayload.name || userPayload.user_name || null;
  const organizationId = userPayload.organizationId || userPayload.organization_id || null;

  const baseContext: ChatContext = {
    userId,
    userRole,
    userEmail,
    userName,
    organizationId,
    maxPermissions: 'read_own_tickets',
  };

  // Role-specific context enrichment
  switch (userRole.toLowerCase()) {
    case 'requester':
      return {
        ...baseContext,
        contactId: userPayload.contactId || userPayload.contact_id || null,
        deviceId: userPayload.deviceId || userPayload.device_id || null,
        maxPermissions: 'read_own_tickets',
      };

    case 'agent':
      return {
        ...baseContext,
        agentId: userPayload.agentId || userPayload.support_agent_id || null,
        specialization: userPayload.specialization || null,
        maxPermissions: 'manage_assigned_tickets',
      };

    case 'admin':
      return {
        ...baseContext,
        maxPermissions: 'full_access',
      };

    default:
      console.warn(`[Chat Start API] Unknown role: ${userRole}, defaulting to requester`);
      return {
        ...baseContext,
        maxPermissions: 'read_own_tickets',
      };
  }
}
