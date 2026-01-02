import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { VoiceSession, ConversationTurn } from '@/lib/models';
import { v4 as uuidv4 } from 'uuid';

// Create a new voice session
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const sessionId = body.sessionId || uuidv4();

    // Extract UTM params and marketing data from headers/body
    const userAgent = request.headers.get('user-agent') || undefined;
    const referrer = request.headers.get('referer') || body.referrer;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;

    const session = await VoiceSession.create({
      sessionId,
      startedAt: new Date(),
      status: 'active',
      userAgent,
      ipAddress,
      referrer,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      utmTerm: body.utmTerm,
      utmContent: body.utmContent,
      landingPage: body.landingPage,
      turnCount: 0,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Failed to create voice session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// Get session by ID (for admin)
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const session = await VoiceSession.findOne({ sessionId }).lean();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Also fetch conversation turns
    const turns = await ConversationTurn.find({ sessionId })
      .sort({ turnIndex: 1 })
      .lean();

    return NextResponse.json({
      session,
      turns,
    });
  } catch (error) {
    console.error('Failed to fetch voice session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// Update session (end, update PII, etc.)
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { sessionId, ...updates } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Calculate duration if ending session
    if (updates.status === 'completed' || updates.status === 'error' || updates.status === 'abandoned') {
      const session = await VoiceSession.findOne({ sessionId });
      if (session) {
        updates.endedAt = new Date();
        updates.durationSeconds = Math.floor(
          (updates.endedAt.getTime() - session.startedAt.getTime()) / 1000
        );
      }
    }

    const updatedSession = await VoiceSession.findOneAndUpdate(
      { sessionId },
      { $set: updates },
      { new: true }
    );

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
    });
  } catch (error) {
    console.error('Failed to update voice session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
