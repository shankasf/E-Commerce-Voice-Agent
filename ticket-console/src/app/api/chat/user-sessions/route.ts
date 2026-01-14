import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const AI_SERVICE_URL = process.env.BASE_URL_AI || 'http://localhost:8080';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

interface JWTPayload {
  userId?: number;
  user_id?: number;
  role?: string;
  userRole?: string;
}

// GET /api/chat/user-sessions - Get all sessions for current user
export async function GET(request: NextRequest) {
  try {
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
        console.error('[User Sessions API] Token verification failed:', jwtErr);
        return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
      }
    }

    const userId = userPayload.userId || userPayload.user_id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
    }

    console.log('[User Sessions API] Fetching sessions for user:', userId);

    // Forward to AI service
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/user-sessions/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Service-Key': AI_SERVICE_API_KEY!,
      },
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[User Sessions API] AI service error:', errorText);
      throw new Error(`AI service error: ${aiResponse.statusText}`);
    }

    const sessionsData = await aiResponse.json();

    console.log('[User Sessions API] Sessions retrieved:', {
      userId,
      count: sessionsData.sessions?.length || 0,
    });

    return NextResponse.json({
      success: true,
      sessions: sessionsData.sessions || [],
      count: sessionsData.count || 0,
    });

  } catch (error: any) {
    console.error('[User Sessions API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
