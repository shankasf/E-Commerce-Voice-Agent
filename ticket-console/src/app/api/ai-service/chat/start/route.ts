import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { callAIService, handleAIServiceResponse, buildContextForRole, JWTPayload } from '@/lib/ai-service-client';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Start a new chat session
 * POST /api/ai-service/chat/start
 */
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

    // Step 2: Build context based on role
    const context = buildContextForRole(userPayload);

    console.log('[Chat Start API] Request:', {
      userId: context.user_id,
      role: context.user_role,
    });

    // Step 3: Call AI service to start session
    const response = await callAIService('/api/chat/start', {
      method: 'POST',
    });

    const aiData = await handleAIServiceResponse<{
      session_id: string;
      greeting: string;
      timestamp: string;
    }>(response, '/api/chat/start');

    // Step 4: Set session context with user info
    if (aiData.session_id) {
      try {
        await callAIService(`/api/session/context?session_id=${encodeURIComponent(aiData.session_id)}`, {
          method: 'POST',
          body: {
            organization_id: context.organization_id,
            contact_id: context.contact_id,
            contact_name: context.user_name,
            phone_number: null, // Can be added if available
          },
        });
      } catch (error) {
        console.warn('[Chat Start API] Failed to set session context:', error);
        // Continue even if context setting fails
      }
    }

    console.log('[Chat Start API] Session started:', {
      sessionId: aiData.session_id,
    });

    // Step 5: Return response to frontend
    return NextResponse.json({
      success: true,
      sessionId: aiData.session_id,
      greeting: aiData.greeting,
      timestamp: aiData.timestamp,
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

