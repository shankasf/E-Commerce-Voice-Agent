import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/analytics/sessions/end
// Beacon-compatible endpoint for marking sessions as completed/abandoned
// Used by navigator.sendBeacon when user closes tab or navigates away
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, status } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const validStatuses = ['completed', 'abandoned'];
    const finalStatus = validStatuses.includes(status) ? status : 'abandoned';

    const session = await prisma.voiceSession.findUnique({
      where: { sessionId },
    });

    if (!session || session.status !== 'active') {
      return NextResponse.json({ success: true });
    }

    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - session.startedAt.getTime()) / 1000
    );

    await prisma.voiceSession.update({
      where: { sessionId },
      data: {
        status: finalStatus,
        endedAt,
        durationSeconds,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to end session via beacon:', error);
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
}
