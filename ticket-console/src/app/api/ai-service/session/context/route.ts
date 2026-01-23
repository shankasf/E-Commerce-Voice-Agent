import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { callAIService, handleAIServiceResponse, buildContextForRole, JWTPayload } from '@/lib/ai-service-client';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Set context for a chat session
 * POST /api/ai-service/session/context
 * Body: { sessionId: string, context?: { organization_id?, contact_id?, contact_name?, phone_number? } }
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

    // Step 2: Extract request body
    const { sessionId, context: providedContext } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Step 3: Build context from user payload
    const userContext = buildContextForRole(userPayload);

    // Step 4: Merge provided context with user context
    const sessionContext = {
      organization_id: providedContext?.organization_id ?? userContext.organizationId,
      organization_name: null, // Can be fetched if needed
      contact_id: providedContext?.contact_id ?? userContext.contactId,
      contact_name: providedContext?.contact_name ?? userContext.userName,
      phone_number: providedContext?.phone_number ?? null,
    };

    console.log('[Session Context API] Setting context:', {
      sessionId,
      context: sessionContext,
    });

    // Step 5: Call AI service to set context
    // Note: FastAPI expects session_id as query param and context as body
    const response = await callAIService(`/api/session/context?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      body: sessionContext,
    });

    const aiData = await handleAIServiceResponse<{
      session_id: string;
      context: Record<string, any>;
    }>(response, '/api/session/context');

    // Step 6: Return response to frontend
    return NextResponse.json({
      success: true,
      sessionId: aiData.session_id,
      context: aiData.context,
    });

  } catch (error: any) {
    console.error('[Session Context API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

