import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8081';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;
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
      userPayload = jwt.verify(token, JWT_SECRET!) as JWTPayload;
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Step 2: Extract request body
    const { message, sessionId } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Step 3: Build context based on role
    const context = buildContextForRole(userPayload);

    // Step 4: Generate or use provided session ID
    const finalSessionId = sessionId || `chat-${context.userId}-${Date.now()}`;

    console.log('[Chat API] Request:', {
      userId: context.userId,
      role: context.userRole,
      sessionId: finalSessionId,
      messageLength: message.length,
    });

    // Step 5: Forward to Python AI service
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Service-Key': AI_SERVICE_API_KEY!,
      },
      body: JSON.stringify({
        message: message.trim(),
        session_id: finalSessionId,
        context,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Chat API] AI service error:', errorText);
      throw new Error(`AI service error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();

    console.log('[Chat API] Response:', {
      sessionId: aiData.session_id,
      agentName: aiData.agent_name,
      toolCallsCount: aiData.tool_calls?.length || 0,
    });

    // Step 6: Return response to frontend
    return NextResponse.json({
      success: true,
      response: aiData.response,
      sessionId: aiData.session_id,
      agentName: aiData.agent_name,
      toolCalls: aiData.tool_calls,
      context: aiData.context,
    });

  } catch (error: any) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        fallback: true,
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
      console.warn(`[Chat API] Unknown role: ${userRole}, defaulting to requester`);
      return {
        ...baseContext,
        maxPermissions: 'read_own_tickets',
      };
  }
}
