import { NextRequest, NextResponse } from 'next/server';
import { generateUserToken, UserPayload } from '@/lib/auth-utils';

/**
 * Generate JWT token for authenticated user
 * POST /api/auth/token
 * 
 * This endpoint generates a JWT token based on the user session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, email, name, organizationId, contactId, agentId, specialization } = body;

    if (!userId || !role || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, role, email' },
        { status: 400 }
      );
    }

    const payload: UserPayload = {
      userId,
      role,
      email,
      name: name || '',
      organizationId,
      contactId,
      agentId,
      specialization,
    };

    const token = generateUserToken(payload);

    return NextResponse.json({
      success: true,
      token,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    });
  } catch (error: any) {
    console.error('[Auth Token API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}




