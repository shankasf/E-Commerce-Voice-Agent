import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { VoiceSession, ConversationTurn } from '@/lib/models';

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

// GET /api/admin/analytics - Get analytics data
export async function GET(request: NextRequest) {
  const auth = verifyToken(request);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'overview';
    const sessionId = searchParams.get('sessionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const qualifiedOnly = searchParams.get('qualifiedOnly') === 'true';
    const followUpOnly = searchParams.get('followUpOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Single session detail view
    if (view === 'session' && sessionId) {
      const session = await VoiceSession.findOne({ sessionId }).lean();
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const turns = await ConversationTurn.find({ sessionId })
        .sort({ turnIndex: 1 })
        .lean();

      return NextResponse.json({ session, turns });
    }

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    
    if (startDate || endDate) {
      filter.startedAt = {};
      if (startDate) filter.startedAt.$gte = new Date(startDate);
      if (endDate) filter.startedAt.$lte = new Date(endDate);
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
        avgDuration,
        sentimentBreakdown,
        topIntents,
        topTopics,
        recentSessions,
      ] = await Promise.all([
        VoiceSession.countDocuments(filter),
        VoiceSession.countDocuments({ ...filter, status: 'completed' }),
        VoiceSession.countDocuments({ ...filter, status: 'error' }),
        VoiceSession.countDocuments({ ...filter, qualifiedLead: true }),
        VoiceSession.countDocuments({ ...filter, followUpRequired: true }),
        VoiceSession.aggregate([
          { $match: { ...filter, durationSeconds: { $exists: true, $ne: null } } },
          { $group: { _id: null, avgDuration: { $avg: '$durationSeconds' } } },
        ]),
        VoiceSession.aggregate([
          { $match: { ...filter, sentiment: { $exists: true } } },
          { $group: { _id: '$sentiment', count: { $sum: 1 } } },
        ]),
        VoiceSession.aggregate([
          { $match: { ...filter, intent: { $exists: true, $ne: null } } },
          { $group: { _id: '$intent', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        VoiceSession.aggregate([
          { $match: { ...filter, topics: { $exists: true, $ne: [] } } },
          { $unwind: '$topics' },
          { $group: { _id: '$topics', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        VoiceSession.find(filter)
          .sort({ startedAt: -1 })
          .limit(5)
          .select('sessionId startedAt status intent sentiment leadScore userName userEmail qualifiedLead')
          .lean(),
      ]);

      return NextResponse.json({
        overview: {
          totalSessions,
          completedSessions,
          errorSessions,
          qualifiedLeads,
          followUpRequired,
          avgDuration: avgDuration[0]?.avgDuration || 0,
          sentimentBreakdown: Object.fromEntries(
            sentimentBreakdown.map((s) => [s._id, s.count])
          ),
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
        VoiceSession.find(filter)
          .sort({ startedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        VoiceSession.countDocuments(filter),
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
