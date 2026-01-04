/**
 * WebRTC Voice Connect API Route
 * 
 * Proxies to OpenAI Realtime API for WebRTC voice connection
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// In-memory session store (use Redis in production)
const voiceSessions = new Map<string, { provider: string; startTime: Date }>();

export async function POST(request: Request) {
  try {
    const { sdp, provider = 'openai' } = await request.json();

    if (!sdp) {
      return NextResponse.json({ error: 'SDP offer is required' }, { status: 400 });
    }

    const sessionId = uuidv4();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (provider === 'openai') {
      const model = process.env.OPENAI_VOICE_MODEL || 'gpt-4o-realtime-preview-2024-12-17';

      const response = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/sdp',
        },
        body: sdp,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI Realtime API error:', errorText);
        return NextResponse.json(
          { error: 'Failed to connect to OpenAI Realtime API', details: errorText },
          { status: response.status }
        );
      }

      const answerSdp = await response.text();

      voiceSessions.set(sessionId, {
        provider: 'openai',
        startTime: new Date(),
      });

      console.log(`Voice session ${sessionId} created`);

      return NextResponse.json({
        sdp: answerSdp,
        sessionId,
        provider: 'openai',
      });
    }

    return NextResponse.json(
      { error: `Provider ${provider} not supported` },
      { status: 400 }
    );
  } catch (error) {
    console.error('WebRTC connect error:', error);
    return NextResponse.json(
      { error: 'Failed to establish voice connection', details: String(error) },
      { status: 500 }
    );
  }
}
