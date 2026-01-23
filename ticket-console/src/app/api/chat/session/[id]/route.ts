import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { aiServiceFetch } from '@/lib/ai-service-client';

const JWT_SECRET = process.env.JWT_SECRET;

interface JWTPayload {
  userId?: number;
  user_id?: number;
  role?: string;
  userRole?: string;
}

// GET /api/chat/session/[id] - Get session history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    // Validate JWT
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
        console.error('[Chat Session API] Token verification failed:', jwtErr);
        return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
      }
    }

    console.log('[Chat Session API] GET request for session:', sessionId);

    // Forward to AI service
    const aiResponse = await aiServiceFetch(`/api/session/${sessionId}`, {
      method: 'GET',
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Chat Session API] AI service error:', errorText);

      if (aiResponse.status === 404) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      throw new Error(`AI service error: ${aiResponse.statusText}`);
    }

    const sessionData = await aiResponse.json();

    console.log('[Chat Session API] Session retrieved:', {
      sessionId,
      messageCount: sessionData.messages?.length || 0,
    });

    return NextResponse.json({
      success: true,
      sessionId: sessionData.session_id,
      history: sessionData.messages || [],
      context: sessionData.context || {},
    });

  } catch (error: any) {
    console.error('[Chat Session API] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/session/[id] - End session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    // Validate JWT
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
        console.error('[Chat Session API] Token verification failed:', jwtErr);
        return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
      }
    }

    console.log('[Chat Session API] DELETE request for session:', sessionId);

    // Forward to AI service
    const aiResponse = await aiServiceFetch(`/api/session/${sessionId}`, {
      method: 'DELETE',
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Chat Session API] AI service error:', errorText);
      throw new Error(`AI service error: ${aiResponse.statusText}`);
    }

    const result = await aiResponse.json();

    console.log('[Chat Session API] Session deleted:', sessionId);

    return NextResponse.json({
      success: true,
      message: result.message || 'Session ended successfully',
    });

  } catch (error: any) {
    console.error('[Chat Session API] DELETE Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
