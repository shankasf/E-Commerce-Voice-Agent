import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

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

// Log a conversation turn
export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { sessionId, role, content, audioDurationMs } = body;

    if (!sessionId || !role || !content) {
      return NextResponse.json(
        { error: 'sessionId, role, and content are required' },
        { status: 400 }
      );
    }

    // Get current turn count
    const existingTurns = await prisma.conversationTurn.count({
      where: { sessionId },
    });
    const turnIndex = existingTurns;

    // Create the turn
    const turn = await prisma.conversationTurn.create({
      data: {
        sessionId,
        turnIndex,
        role,
        content,
        timestamp: new Date(),
        audioDurationMs,
      },
    });

    // Update session turn count
    await prisma.voiceSession.update({
      where: { sessionId },
      data: { turnCount: { increment: 1 } },
    });

    // Extract PII from user messages asynchronously
    if (role === 'user') {
      extractPIIAsync(sessionId, turnIndex, content);
    }

    return NextResponse.json({
      success: true,
      turnId: turn.id,
      turnIndex,
    });
  } catch (error) {
    console.error('Failed to log conversation turn:', error);
    return NextResponse.json(
      { error: 'Failed to log turn' },
      { status: 500 }
    );
  }
}

// Get all turns for a session
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

    const turns = await prisma.conversationTurn.findMany({
      where: { sessionId },
      orderBy: { turnIndex: 'asc' },
    });

    return NextResponse.json({ turns });
  } catch (error) {
    console.error('Failed to fetch conversation turns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch turns' },
      { status: 500 }
    );
  }
}

// Async PII extraction using LLM
async function extractPIIAsync(sessionId: string, turnIndex: number, content: string) {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract any personal information from the user message. Return a JSON object with these fields (use null if not found):
{
  "name": "extracted full name or null",
  "email": "extracted email or null",
  "phone": "extracted phone number or null",
  "company": "extracted company name or null"
}
Only return the JSON object, nothing else.`,
        },
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0,
      max_tokens: 200,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) return;

    try {
      const extracted = JSON.parse(result);

      // Update the turn with extracted PII
      const updateTurn: Record<string, string> = {};
      if (extracted.name) updateTurn.extractedName = extracted.name;
      if (extracted.email) updateTurn.extractedEmail = extracted.email;
      if (extracted.phone) updateTurn.extractedPhone = extracted.phone;
      if (extracted.company) updateTurn.extractedCompany = extracted.company;

      if (Object.keys(updateTurn).length > 0) {
        await prisma.conversationTurn.updateMany({
          where: { sessionId, turnIndex },
          data: updateTurn,
        });

        // Also update the session with PII (first non-null wins)
        const session = await prisma.voiceSession.findUnique({
          where: { sessionId },
        });

        if (session) {
          const sessionUpdate: Record<string, string> = {};
          if (!session.userName && extracted.name) sessionUpdate.userName = extracted.name;
          if (!session.userEmail && extracted.email) sessionUpdate.userEmail = extracted.email;
          if (!session.userPhone && extracted.phone) sessionUpdate.userPhone = extracted.phone;
          if (!session.userCompany && extracted.company) sessionUpdate.userCompany = extracted.company;

          if (Object.keys(sessionUpdate).length > 0) {
            await prisma.voiceSession.update({
              where: { sessionId },
              data: sessionUpdate,
            });
          }
        }
      }
    } catch {
      // JSON parse error, ignore
    }
  } catch (error) {
    console.error('PII extraction failed:', error);
    // Non-blocking, don't throw
  }
}
