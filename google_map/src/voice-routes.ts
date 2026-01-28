/**
 * WebRTC Voice Routes - Backend API for WebRTC Voice Widget
 * 
 * Provides WebRTC signaling endpoints that proxy to AI voice services.
 * Supports OpenAI Realtime API, Eleven Labs, and xAI Grok.
 */

import express, { Router, Request, Response } from 'express';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

const router: Router = express.Router();

// Active sessions store
const activeSessions: Map<string, {
  ws?: WebSocket;
  provider: string;
  startTime: Date;
  pc?: any; // RTCPeerConnection is browser-only
}> = new Map();

// OpenAI Realtime API WebRTC endpoint
const OPENAI_REALTIME_URL = 'https://api.openai.com/v1/realtime';

interface ConnectRequest {
  sdp: string;
  provider?: 'openai' | 'elevenlabs' | 'xai';
  systemPrompt?: string;
  voice?: string;
}

/**
 * WebRTC Connect - Establish connection to AI voice service
 */
router.post('/connect', async (req: Request, res: Response) => {
  const { sdp, provider = 'openai', systemPrompt, voice } = req.body as ConnectRequest;

  if (!sdp) {
    return res.status(400).json({ error: 'SDP offer is required' });
  }

  const sessionId = uuidv4();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  }

  try {
    // For OpenAI Realtime API
    if (provider === 'openai') {
      const model = process.env.OPENAI_VOICE_MODEL || 'gpt-4o-realtime-preview-2024-12-17';
      const selectedVoice = voice || process.env.OPENAI_VOICE || 'alloy';

      // Create session with OpenAI Realtime API
      const response = await fetch(`${OPENAI_REALTIME_URL}?model=${model}`, {
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
        return res.status(response.status).json({ 
          error: 'Failed to connect to OpenAI Realtime API',
          details: errorText 
        });
      }

      const answerSdp = await response.text();

      // Store session
      activeSessions.set(sessionId, {
        provider: 'openai',
        startTime: new Date(),
      });

      console.log(`Voice session ${sessionId} created with OpenAI Realtime API`);

      return res.json({
        sdp: answerSdp,
        sessionId,
        provider: 'openai',
      });
    }

    // For other providers (Eleven Labs, xAI) - placeholder
    return res.status(400).json({ 
      error: `Provider ${provider} not yet implemented for WebRTC` 
    });

  } catch (error) {
    console.error('WebRTC connect error:', error);
    return res.status(500).json({ 
      error: 'Failed to establish voice connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * WebRTC Disconnect - Clean up session
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const session = activeSessions.get(sessionId);
  if (session) {
    // Close WebSocket if exists
    if (session.ws) {
      session.ws.close();
    }
    activeSessions.delete(sessionId);
    console.log(`Voice session ${sessionId} disconnected`);
  }

  return res.json({ success: true, sessionId });
});

/**
 * Get active sessions count
 */
router.get('/sessions', (_req: Request, res: Response) => {
  const sessions = Array.from(activeSessions.entries()).map(([id, session]) => ({
    sessionId: id,
    provider: session.provider,
    startTime: session.startTime,
    duration: Math.floor((Date.now() - session.startTime.getTime()) / 1000),
  }));

  return res.json({
    count: sessions.length,
    sessions,
  });
});

export default router;
