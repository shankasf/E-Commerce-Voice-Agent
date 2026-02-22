import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_ORIGINS = [
  'https://callsphere.tech',
  'https://www.callsphere.tech',
  'http://localhost:3000',
];

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (origin && ALLOWED_ORIGINS.includes(origin)) return true;
  if (referer && ALLOWED_ORIGINS.some((o) => referer.startsWith(o))) return true;
  return false;
}

// Create a new voice session
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const sessionId = body.sessionId || uuidv4();

    // Extract UTM params and marketing data from headers/body
    const userAgent = request.headers.get('user-agent') || undefined;
    const referrer = request.headers.get('referer') || body.referrer;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;

    const session = await prisma.voiceSession.create({
      data: {
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
      },
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
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const session = await prisma.voiceSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Also fetch conversation turns
    const turns = await prisma.conversationTurn.findMany({
      where: { sessionId },
      orderBy: { turnIndex: 'asc' },
    });

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
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
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
      const session = await prisma.voiceSession.findUnique({
        where: { sessionId },
      });
      if (session) {
        updates.endedAt = new Date();
        updates.durationSeconds = Math.floor(
          (updates.endedAt.getTime() - session.startedAt.getTime()) / 1000
        );
      }
    }

    const updatedSession = await prisma.voiceSession.update({
      where: { sessionId },
      data: updates,
    });

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
