import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';
import { Sentiment } from '@prisma/client';

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

// Lazy-load OpenAI client to avoid build-time errors
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// Enrich a session with LLM analysis
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Fetch the session and all turns
    const session = await prisma.voiceSession.findUnique({
      where: { sessionId },
    });
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const turns = await prisma.conversationTurn.findMany({
      where: { sessionId },
      orderBy: { turnIndex: 'asc' },
    });

    if (turns.length === 0) {
      return NextResponse.json(
        { error: 'No conversation turns to analyze' },
        { status: 400 }
      );
    }

    // Format conversation for analysis
    const conversation = turns
      .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
      .join('\n\n');

    // Store raw transcript
    const rawTranscript = turns
      .map((t) => `[${t.role === 'user' ? 'User' : 'Agent'}]: ${t.content}`)
      .join('\n');

    // Call LLM for enrichment
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert sales and marketing analyst. Analyze this voice agent conversation from CallSphere's website and extract insights.

IMPORTANT: You must return ONLY a valid JSON object with no additional text, markdown, or explanation.

The JSON object must have these exact fields:
{
  "intent": "Primary intent (e.g., 'product inquiry', 'pricing question', 'demo request', 'support', 'general info')",
  "sentiment": "MUST be exactly one of: 'positive', 'neutral', or 'negative'",
  "leadScore": 5,
  "topics": ["topic1", "topic2"],
  "summary": "2-3 sentence summary",
  "actionItems": ["action1", "action2"],
  "followUpRequired": false,
  "qualifiedLead": false,
  "userRole": null,
  "userLocation": null
}

Sentiment Guidelines:
- "positive": User expressed interest, asked detailed questions, mentioned buying intent, scheduled demo, or showed enthusiasm
- "neutral": User asked general questions, was polite but non-committal, just browsing
- "negative": User expressed frustration, complained, or showed disinterest

Lead Score Guidelines:
- 8-10: Expressed clear buying intent, asked about pricing, wanted demo
- 5-7: Showed genuine interest, asked detailed product questions
- 3-4: Just browsing, general questions only
- 1-2: Wrong number, off-topic, or negative interaction`,
        },
        {
          role: 'user',
          content: conversation,
        },
      ],
      temperature: 0.1,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      return NextResponse.json(
        { error: 'No analysis result' },
        { status: 500 }
      );
    }

    try {
      const analysis = JSON.parse(result);

      // Validate sentiment value
      const validSentiments = ['positive', 'neutral', 'negative'];
      const sentimentValue = validSentiments.includes(analysis.sentiment?.toLowerCase())
        ? analysis.sentiment.toLowerCase()
        : 'neutral';

      // Map to Prisma enum
      const sentiment: Sentiment = sentimentValue as Sentiment;

      // Build update data
      const updateData: {
        intent: string;
        sentiment: Sentiment;
        leadScore: number;
        topics: string[];
        summary: string;
        actionItems: string[];
        followUpRequired: boolean;
        qualifiedLead: boolean;
        rawTranscript: string;
        userRole?: string;
        userLocation?: string;
      } = {
        intent: analysis.intent || 'unknown',
        sentiment: sentiment,
        leadScore: typeof analysis.leadScore === 'number' ? analysis.leadScore : 5,
        topics: Array.isArray(analysis.topics) ? analysis.topics : [],
        summary: analysis.summary || '',
        actionItems: Array.isArray(analysis.actionItems) ? analysis.actionItems : [],
        followUpRequired: Boolean(analysis.followUpRequired),
        qualifiedLead: Boolean(analysis.qualifiedLead),
        rawTranscript: rawTranscript,
      };

      // Only update role/location if not already set
      if (analysis.userRole && !session.userRole) {
        updateData.userRole = analysis.userRole;
      }
      if (analysis.userLocation && !session.userLocation) {
        updateData.userLocation = analysis.userLocation;
      }

      const updatedSession = await prisma.voiceSession.update({
        where: { sessionId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        analysis,
        session: updatedSession,
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse analysis result' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to enrich session:', error);
    return NextResponse.json(
      { error: 'Failed to enrich session' },
      { status: 500 }
    );
  }
}
