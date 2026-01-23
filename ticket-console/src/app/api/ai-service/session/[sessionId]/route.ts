import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { callAIService, handleAIServiceResponse, JWTPayload } from '@/lib/ai-service-client';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Get session information
 * GET /api/ai-service/session/[sessionId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Step 1: Extract and validate JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    try {
      jwt.verify(token, JWT_SECRET!) as JWTPayload;
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    console.log('[Session Get API] Request:', { sessionId });

    // Step 2: Call AI service to get session
    const response = await callAIService(`/api/session/${sessionId}`, {
      method: 'GET',
    });

    const aiData = await handleAIServiceResponse<{
      session_id: string;
      context: Record<string, any>;
      summary: string;
      turn_count: number;
      messages: Array<{ role: string; content: string; timestamp?: string }>;
    }>(response, `/api/session/${sessionId}`);

    // Step 3: Return response to frontend
    return NextResponse.json({
      success: true,
      sessionId: aiData.session_id,
      context: aiData.context,
      summary: aiData.summary,
      turnCount: aiData.turn_count,
      messages: aiData.messages,
    });

  } catch (error: any) {
    console.error('[Session Get API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Delete/End a session
 * DELETE /api/ai-service/session/[sessionId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    // Step 1: Extract and validate JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    try {
      jwt.verify(token, JWT_SECRET!) as JWTPayload;
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    console.log('[Session Delete API] Request:', { sessionId });

    // Step 2: Call AI service to delete session
    const response = await callAIService(`/api/session/${sessionId}`, {
      method: 'DELETE',
    });

    const aiData = await handleAIServiceResponse<{
      status: string;
      session_id: string;
    }>(response, `/api/session/${sessionId}`);

    // Step 3: Return response to frontend
    return NextResponse.json({
      success: true,
      status: aiData.status,
      sessionId: aiData.session_id,
    });

  } catch (error: any) {
    console.error('[Session Delete API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}










