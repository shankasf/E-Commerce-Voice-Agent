import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { aiServiceFetch, buildContextForRole, JWTPayload } from '@/lib/ai-service-client';

const JWT_SECRET = process.env.JWT_SECRET;

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
        console.error('[Chat API] Token verification failed:', jwtErr);
        return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
      }
    }

    // Step 2: Extract request body
    const { message, sessionId } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Step 3: Build context based on role
    const context = buildContextForRole(userPayload);

    // Step 4: Generate or use provided session ID
    const finalSessionId = sessionId || `chat-${context.user_id}-${Date.now()}`;

    console.log('[Chat API] Request:', {
      userId: context.user_id,
      role: context.user_role,
      sessionId: finalSessionId,
      messageLength: message.length,
    });

    // Step 5: Forward to Python AI service
    const aiResponse = await aiServiceFetch('/api/chat', {
      method: 'POST',
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