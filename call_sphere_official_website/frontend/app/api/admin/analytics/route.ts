import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { SessionStatus, Prisma } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'callsphere-admin-secret-change-in-production';

// Verify admin token
function verifyToken(request: NextRequest): { valid: boolean; error?: string } {
  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid token' };
  }
}

// Clean up stale active sessions (active for more than 30 minutes)
async function cleanupStaleSessions() {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const staleSessions = await prisma.voiceSession.findMany({
    where: {
      status: 'active',
      startedAt: { lt: thirtyMinutesAgo },
    },
    select: { sessionId: true, startedAt: true },
  });

  if (staleSessions.length > 0) {
    for (const session of staleSessions) {
      const durationSeconds = Math.floor(
        (Date.now() - session.startedAt.getTime()) / 1000
      );
      await prisma.voiceSession.update({
        where: { sessionId: session.sessionId },
        data: {
          status: 'abandoned',
          endedAt: new Date(),
          durationSeconds,
        },
      });
    }
    console.log(`Cleaned up ${staleSessions.length} stale active sessions`);
  }
}

// GET /api/admin/analytics - Get analytics data
export async function GET(request: NextRequest) {
  const auth = verifyToken(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    // Clean up stale sessions before fetching analytics
    await cleanupStaleSessions();

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'overview';
    const sessionId = searchParams.get('sessionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status') as SessionStatus | null;
    const qualifiedOnly = searchParams.get('qualifiedOnly') === 'true';
    const followUpOnly = searchParams.get('followUpOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Single session detail view
    if (view === 'session' && sessionId) {
      const session = await prisma.voiceSession.findUnique({
        where: { sessionId },
      });
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const turns = await prisma.conversationTurn.findMany({
        where: { sessionId },
        orderBy: { turnIndex: 'asc' },
      });

      return NextResponse.json({ session, turns });
    }

    // Build filter
    const filter: Prisma.VoiceSessionWhereInput = {};

    if (startDate || endDate) {
      filter.startedAt = {};
      if (startDate) filter.startedAt.gte = new Date(startDate);
      if (endDate) filter.startedAt.lte = new Date(endDate);
    }

    if (status) {
      filter.status = status;
    }

    if (qualifiedOnly) {
      filter.qualifiedLead = true;
    }

    if (followUpOnly) {
      filter.followUpRequired = true;
    }

    // Overview stats
    if (view === 'overview') {
      const [
        totalSessions,
        completedSessions,
        errorSessions,
        qualifiedLeads,
        followUpRequired,
        avgDurationResult,
        sentimentCounts,
        recentSessions,
      ] = await Promise.all([
        prisma.voiceSession.count({ where: filter }),
        prisma.voiceSession.count({ where: { ...filter, status: 'completed' } }),
        prisma.voiceSession.count({ where: { ...filter, status: 'error' } }),
        prisma.voiceSession.count({ where: { ...filter, qualifiedLead: true } }),
        prisma.voiceSession.count({ where: { ...filter, followUpRequired: true } }),
        prisma.voiceSession.aggregate({
          where: { ...filter, durationSeconds: { not: null } },
          _avg: { durationSeconds: true },
        }),
        prisma.voiceSession.groupBy({
          by: ['sentiment'],
          where: { ...filter, sentiment: { not: null } },
          _count: { sentiment: true },
        }),
        prisma.voiceSession.findMany({
          where: filter,
          orderBy: { startedAt: 'desc' },
          take: 5,
          select: {
            sessionId: true,
            startedAt: true,
            status: true,
            intent: true,
            sentiment: true,
            leadScore: true,
            userName: true,
            userEmail: true,
            qualifiedLead: true,
          },
        }),
      ]);

      // Get top intents using raw query for groupBy with count
      const topIntentsRaw = await prisma.voiceSession.groupBy({
        by: ['intent'],
        where: { ...filter, intent: { not: null } },
        _count: { intent: true },
        orderBy: { _count: { intent: 'desc' } },
        take: 10,
      });

      const topIntents = topIntentsRaw.map((i) => ({
        _id: i.intent,
        count: i._count.intent,
      }));

      // Get top topics - need to handle array field
      const sessionsWithTopics = await prisma.voiceSession.findMany({
        where: { ...filter, topics: { isEmpty: false } },
        select: { topics: true },
      });

      // Count topics manually
      const topicCounts: Record<string, number> = {};
      sessionsWithTopics.forEach((s) => {
        s.topics.forEach((topic) => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      });

      const topTopics = Object.entries(topicCounts)
        .map(([topic, count]) => ({ _id: topic, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Format sentiment breakdown
      const sentimentBreakdown: Record<string, number> = {};
      sentimentCounts.forEach((s) => {
        if (s.sentiment) {
          sentimentBreakdown[s.sentiment] = s._count.sentiment;
        }
      });

      return NextResponse.json({
        overview: {
          totalSessions,
          completedSessions,
          errorSessions,
          qualifiedLeads,
          followUpRequired,
          avgDuration: avgDurationResult._avg.durationSeconds || 0,
          sentimentBreakdown,
        },
        topIntents,
        topTopics,
        recentSessions,
      });
    }

    // List sessions
    if (view === 'sessions') {
      const skip = (page - 1) * limit;

      const [sessions, total] = await Promise.all([
        prisma.voiceSession.findMany({
          where: filter,
          orderBy: { startedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.voiceSession.count({ where: filter }),
      ]);

      return NextResponse.json({
        sessions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    }

    return NextResponse.json({ error: 'Invalid view' }, { status: 400 });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
