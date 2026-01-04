/**
 * WebRTC Voice Disconnect API Route
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    
    if (sessionId) {
      console.log(`Voice session ${sessionId} disconnected`);
    }

    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    console.error('WebRTC disconnect error:', error);
    return NextResponse.json({ success: false, error: String(error) });
  }
}
