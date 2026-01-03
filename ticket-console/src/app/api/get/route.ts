import { NextResponse } from 'next/server';

/**
 * UptimeRobot health check endpoint
 * GET & HEAD /api/get
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'U Rack IT Ticket Management Console',
    timestamp: new Date().toISOString(),
  });
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
