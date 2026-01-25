import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Get ticket details directly from supabase
    const { data: ticket, error: ticketError } = await supabaseServer
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

    // If ticket has device_id, fetch device details directly from database
    let device = null;
    if (ticket.device_id) {
      const { data: deviceData } = await supabaseServer
        .from('devices')
        .select(`
          *,
          manufacturer:device_manufacturer_id(name),
          model:device_model_id(name, model_number),
          os:operating_system_id(name, version),
          device_type:device_type_id(name),
          domain:domain_id(domain_name),
          processor:processor_id(model_name, architecture:processor_architecture_id(name)),
          update_status:update_status_id(name),
          location:location_id(name)
        `)
        .eq('device_id', ticket.device_id)
        .single();
      device = deviceData;
    }

    if (device) {
      const response = NextResponse.json({
        device,
        ticket: {
          ticket_id: ticket.ticket_id,
          subject: ticket.subject,
          description: ticket.description,
          organization: ticket.organization,
          contact: ticket.contact,
        },
      });
      // Cache device details for 30 minutes
      response.headers.set('Cache-Control', 'private, max-age=1800');
      return response;
    }

    // If no device_id, return ticket info and organization devices
    let devices: any[] = [];
    if (ticket.organization_id) {
      const { data: devicesData } = await supabaseServer
        .from('devices')
        .select(`
          *,
          manufacturer:device_manufacturer_id(name),
          model:device_model_id(name),
          location:location_id(name)
        `)
        .eq('organization_id', ticket.organization_id);
      devices = devicesData || [];
    }

    const response = NextResponse.json({
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
    // Cache response for 30 minutes
    response.headers.set('Cache-Control', 'private, max-age=1800');
    return response;
  } catch (error: any) {
    console.error('Error fetching device details:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

