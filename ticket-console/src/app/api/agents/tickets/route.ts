/**
 * API Route: Agent Tickets CRUD
 * /api/agents/tickets
 *
 * Provides CRUD operations for tickets used by AI agents.
 * All requests require x-ai-service-key header for authentication.
 *
 * GET /api/agents/tickets?contact_id=123
 * GET /api/agents/tickets?organization_id=456
 * GET /api/agents/tickets?ticket_id=789
 * POST /api/agents/tickets
 * PUT /api/agents/tickets?ticket_id=789
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const aiServiceApiKey = process.env.AI_SERVICE_API_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Agents/Tickets] Missing required Supabase environment variables');
}

if (!aiServiceApiKey) {
  console.error('[Agents/Tickets] Missing AI_SERVICE_API_KEY');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Validate AI service authentication
 */
function validateAuth(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get('x-ai-service-key');
  
  if (!apiKey || apiKey !== aiServiceApiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: Invalid AI service credentials',
      },
      { status: 401 }
    );
  }
  
  return null;
}

/**
 * GET /api/agents/tickets
 * Query tickets by contact_id, organization_id, or ticket_id
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authError = validateAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const ticket_id = searchParams.get('ticket_id');
    const contact_id = searchParams.get('contact_id');
    const organization_id = searchParams.get('organization_id');

    let query = supabase
      .from('support_tickets')
      .select(`
        ticket_id,
        contact_id,
        organization_id,
        subject,
        description,
        status:status_id(name),
        priority:priority_id(name),
        created_at,
        updated_at,
        contact:contact_id(full_name,email),
        organization:organization_id(name,u_e_code)
      `)
      .order('created_at', { ascending: false });

    if (ticket_id) {
      const id = parseInt(ticket_id, 10);
      if (isNaN(id)) {
        return NextResponse.json(
          {
            success: false,
            error: 'ticket_id must be numeric',
            data: null,
          },
          { status: 400 }
        );
      }
      query = query.eq('ticket_id', id);
    } else if (contact_id) {
      const id = parseInt(contact_id, 10);
      if (isNaN(id)) {
        return NextResponse.json(
          {
            success: false,
            error: 'contact_id must be numeric',
            data: null,
          },
          { status: 400 }
        );
      }
      query = query.eq('contact_id', id);
    } else if (organization_id) {
      const id = parseInt(organization_id, 10);
      if (isNaN(id)) {
        return NextResponse.json(
          {
            success: false,
            error: 'organization_id must be numeric',
            data: null,
          },
          { status: 400 }
        );
      }
      query = query.eq('organization_id', id);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing query parameter: ticket_id, contact_id, or organization_id is required',
          data: null,
        },
        { status: 400 }
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Agents/Tickets] Query error:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${error.message}`,
          data: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('[Agents/Tickets] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error.message || 'Unknown error'}`,
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/tickets
 * Create a new ticket
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authError = validateAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const { 
      contact_id, 
      organization_id, 
      subject, 
      description, 
      priority_id, 
      status_id,
      device_id 
    } = body;

    // Validate required fields
    if (!contact_id || isNaN(parseInt(String(contact_id), 10))) {
      return NextResponse.json(
        {
          success: false,
          error: 'contact_id is required and must be numeric',
          data: null,
        },
        { status: 400 }
      );
    }

    if (!organization_id || isNaN(parseInt(String(organization_id), 10))) {
      return NextResponse.json(
        {
          success: false,
          error: 'organization_id is required and must be numeric',
          data: null,
        },
        { status: 400 }
      );
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'subject is required',
          data: null,
        },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'description is required',
          data: null,
        },
        { status: 400 }
      );
    }

    // Prepare ticket data
    const ticketData: any = {
      contact_id: parseInt(String(contact_id), 10),
      organization_id: parseInt(String(organization_id), 10),
      subject: subject.trim(),
      description: description.trim(),
    };

    if (priority_id && !isNaN(parseInt(String(priority_id), 10))) {
      ticketData.priority_id = parseInt(String(priority_id), 10);
    }

    if (status_id && !isNaN(parseInt(String(status_id), 10))) {
      ticketData.status_id = parseInt(String(status_id), 10);
    }

    if (device_id && !isNaN(parseInt(String(device_id), 10))) {
      ticketData.device_id = parseInt(String(device_id), 10);
    }

    // Create ticket
    const { data, error } = await supabase
      .from('support_tickets')
      .insert(ticketData)
      .select('ticket_id,contact_id,organization_id,subject,status_id,priority_id,created_at')
      .single();

    if (error) {
      console.error('[Agents/Tickets] Insert error:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create ticket: ${error.message}`,
          data: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ticket_id: data.ticket_id,
        contact_id: data.contact_id,
        organization_id: data.organization_id,
        subject: data.subject,
        status_id: data.status_id,
        priority_id: data.priority_id,
      },
      message: `Ticket created successfully. ticket_id: ${data.ticket_id}`,
    });
  } catch (error: any) {
    console.error('[Agents/Tickets] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error.message || 'Unknown error'}`,
        data: null,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/tickets
 * Update ticket status or escalate ticket
 */
export async function PUT(request: NextRequest) {
  try {
    // Validate authentication
    const authError = validateAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const ticket_id = searchParams.get('ticket_id');

    if (!ticket_id || isNaN(parseInt(ticket_id, 10))) {
      return NextResponse.json(
        {
          success: false,
          error: 'ticket_id query parameter is required and must be numeric',
          data: null,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, escalate, reason, to_human } = body;

    // Handle escalation
    if (escalate) {
      if (!reason || !reason.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'reason is required for escalation',
            data: null,
          },
          { status: 400 }
        );
      }

      // Update ticket status to escalated (status_id 4) and set requires_human_agent
      const { data: ticketData, error: updateError } = await supabase
        .from('support_tickets')
        .update({ 
          status_id: 4, // Escalated status
          requires_human_agent: to_human !== false,
          updated_at: new Date().toISOString(),
        })
        .eq('ticket_id', parseInt(ticket_id, 10))
        .select('ticket_id')
        .single();

      if (updateError || !ticketData) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to escalate ticket: ${updateError?.message || 'Ticket not found'}`,
            data: null,
          },
          { status: 500 }
        );
      }

      // Create escalation record
      const { error: escalationError } = await supabase
        .from('ticket_escalations')
        .insert({
          ticket_id: parseInt(ticket_id, 10),
          from_agent_id: 1, // Bot agent
          reason: reason.trim(),
        });

      if (escalationError) {
        console.error('[Agents/Tickets] Escalation record error:', escalationError);
        // Continue even if escalation record fails
      }

      return NextResponse.json({
        success: true,
        data: {
          ticket_id: ticketData.ticket_id,
          escalated: true,
        },
        message: `Ticket ${ticket_id} escalated. Reason: ${reason.trim()}`,
      });
    }

    // Handle status update
    if (!status || !status.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'status is required (or use escalate=true for escalation)',
          data: null,
        },
        { status: 400 }
      );
    }

    // Find status_id by name
    const { data: statusData } = await supabase
      .from('ticket_statuses')
      .select('status_id')
      .ilike('name', status.trim())
      .maybeSingle();

    if (!statusData) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status: ${status}. Use get_ticket_statuses to see available statuses.`,
          data: null,
        },
        { status: 400 }
      );
    }

    // Update ticket
    const { data, error } = await supabase
      .from('support_tickets')
      .update({ 
        status_id: statusData.status_id,
        updated_at: new Date().toISOString(),
      })
      .eq('ticket_id', parseInt(ticket_id, 10))
      .select('ticket_id,status_id')
      .single();

    if (error) {
      console.error('[Agents/Tickets] Update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to update ticket: ${error.message}`,
          data: null,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: `Ticket with ID ${ticket_id} not found`,
          data: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ticket_id: data.ticket_id,
        status_id: data.status_id,
      },
      message: `Ticket status updated successfully. ticket_id: ${data.ticket_id}`,
    });
  } catch (error: any) {
    console.error('[Agents/Tickets] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${error.message || 'Unknown error'}`,
        data: null,
      },
      { status: 500 }
    );
  }
}

