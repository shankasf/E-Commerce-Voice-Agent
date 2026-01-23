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

// GET /api/chat/live-sessions - Get all active chat sessions (Admin only)
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
        console.error('[Live Sessions API] Token verification failed:', jwtErr);
        return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
      }
    }

    // Check if user is admin
    const userRole = userPayload.role || userPayload.userRole || 'requester';
    if (userRole.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    console.log('[Live Sessions API] Fetching active sessions');

    // Forward to AI service
    const aiResponse = await aiServiceFetch('/api/live-sessions', {
      method: 'GET',
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Live Sessions API] AI service error:', errorText);
      throw new Error(`AI service error: ${aiResponse.statusText}`);
    }

    const sessionsData = await aiResponse.json();

    console.log('[Live Sessions API] Sessions retrieved:', {
      count: sessionsData.sessions?.length || 0,
    });

    return NextResponse.json({
      success: true,
      sessions: sessionsData.sessions || [],
      count: sessionsData.count || 0,
    });

  } catch (error: any) {
    console.error('[Live Sessions API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
