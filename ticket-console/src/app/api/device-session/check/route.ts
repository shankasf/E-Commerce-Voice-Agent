import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * POST /api/device-session/check
 *
 * Check if a ticket has an active device session.
 * Returns session details if active, or null if no active session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Query device_sessions table for active session
    const { data, error } = await supabaseServer
      .from('device_sessions')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking device session:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const hasActiveSession = data && data.length > 0;
    const session = hasActiveSession ? data[0] : null;

    return NextResponse.json({
      hasActiveSession,
      session,
    });
  } catch (error: any) {
    console.error('Error in device-session/check:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
