import { NextRequest, NextResponse } from 'next/server';
import { getDeviceById, getDevices } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Get ticket details directly from supabase
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *,
        status:status_id(name),
        priority:priority_id(name),
        organization:organization_id(name, u_e_code),
        contact:contact_id(full_name, email, phone)
      `)
      .eq('ticket_id', parseInt(ticketId))
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // If ticket has device_id, fetch device details
    if (ticket.device_id) {
      const device = await getDeviceById(ticket.device_id);
      if (device) {
        return NextResponse.json({
          device,
          ticket: {
            ticket_id: ticket.ticket_id,
            subject: ticket.subject,
            description: ticket.description,
            organization: ticket.organization,
            contact: ticket.contact,
          },
        });
      }
    }

    // If no device_id, return ticket info and organization devices
    const devices = ticket.organization_id
      ? await getDevices(ticket.organization_id)
      : [];

    return NextResponse.json({
      device: null,
      ticket: {
        ticket_id: ticket.ticket_id,
        subject: ticket.subject,
        description: ticket.description,
        organization: ticket.organization,
        contact: ticket.contact,
      },
      availableDevices: devices,
    });
  } catch (error: any) {
    console.error('Error fetching device details:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

