/**
 * API Route: Add Ticket Message
 * POST /api/agents/tickets/[ticketId]/messages
 *
 * Add a message/note to a ticket.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const aiServiceApiKey = process.env.AI_SERVICE_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function validateAuth(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get('x-ai-service-key');
  if (!apiKey || apiKey !== aiServiceApiKey) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid AI service credentials' },
      { status: 401 }
    );
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const authError = validateAuth(request);
    if (authError) return authError;

    const ticketId = parseInt(params.ticketId, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ticket_id', data: null },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message content is required', data: null },
        { status: 400 }
      );
    }

    // Verify ticket exists
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('ticket_id')
      .eq('ticket_id', ticketId)
      .maybeSingle();

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: `Ticket with ID ${ticketId} not found`, data: null },
        { status: 404 }
      );
    }

    // Add message
    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        content: message.trim(),
        message_type: 'text',
        sender_agent_id: 1, // Bot agent
        message_time: new Date().toISOString(),
      })
      .select('message_id,ticket_id,content,message_time')
      .single();

    if (error) {
      console.error('[Agents/Tickets/Messages] Insert error:', error);
      return NextResponse.json(
        { success: false, error: `Failed to add message: ${error.message}`, data: null },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message_id: data.message_id,
        ticket_id: data.ticket_id,
      },
      message: `Message added to ticket ${ticketId}`,
    });
  } catch (error: any) {
    console.error('[Agents/Tickets/Messages] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}`, data: null },
      { status: 500 }
    );
  }
}

