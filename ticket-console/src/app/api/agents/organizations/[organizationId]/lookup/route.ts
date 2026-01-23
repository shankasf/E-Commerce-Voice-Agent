/**
 * API Route: Lookup Organization Data
 * GET /api/agents/organizations/[organizationId]/lookup?query_type=devices&search_term=...
 *
 * Universal lookup tool for organization data.
 * Query types: devices, locations, contacts, tickets, summary, find_device, find_contact
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

export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const authError = validateAuth(request);
    if (authError) return authError;

    const organizationId = parseInt(params.organizationId, 10);
    if (isNaN(organizationId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid organization_id', data: null },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query_type = searchParams.get('query_type')?.toLowerCase();
    const search_term = searchParams.get('search_term') || '';

    if (!query_type) {
      return NextResponse.json(
        {
          success: false,
          error: 'query_type parameter is required. Use: devices, locations, contacts, tickets, summary, find_device, find_contact',
          data: null,
        },
        { status: 400 }
      );
    }

    let result: any;

    switch (query_type) {
      case 'devices': {
        const { data, error } = await supabase
          .from('devices')
          .select('device_id,asset_name,status,host_name,public_ip')
          .eq('organization_id', organizationId);
        if (error) throw error;
        result = data || [];
        break;
      }

      case 'locations': {
        const { data, error } = await supabase
          .from('locations')
          .select('location_id,name,location_type,requires_human_agent')
          .eq('organization_id', organizationId);
        if (error) throw error;
        result = data || [];
        break;
      }

      case 'contacts': {
        const { data, error } = await supabase
          .from('contacts')
          .select('contact_id,full_name,email,phone')
          .eq('organization_id', organizationId);
        if (error) throw error;
        result = data || [];
        break;
      }

      case 'tickets': {
        const { data, error } = await supabase
          .from('support_tickets')
          .select('ticket_id,subject,status:status_id(name),priority:priority_id(name),created_at')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        result = data || [];
        break;
      }

      case 'summary': {
        const [devices, contacts, locations, tickets] = await Promise.all([
          supabase.from('devices').select('device_id', { count: 'exact', head: true }).eq('organization_id', organizationId),
          supabase.from('contacts').select('contact_id', { count: 'exact', head: true }).eq('organization_id', organizationId),
          supabase.from('locations').select('location_id', { count: 'exact', head: true }).eq('organization_id', organizationId),
          supabase.from('support_tickets').select('ticket_id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        ]);
        result = {
          devices: devices.count || 0,
          contacts: contacts.count || 0,
          locations: locations.count || 0,
          tickets: tickets.count || 0,
        };
        break;
      }

      case 'find_device': {
        if (!search_term) {
          return NextResponse.json(
            { success: false, error: 'search_term is required for find_device', data: null },
            { status: 400 }
          );
        }
        const { data, error } = await supabase
          .from('devices')
          .select('device_id,asset_name,status,host_name,public_ip')
          .eq('organization_id', organizationId)
          .ilike('asset_name', `%${search_term}%`);
        if (error) throw error;
        result = data || [];
        break;
      }

      case 'find_contact': {
        if (!search_term) {
          return NextResponse.json(
            { success: false, error: 'search_term is required for find_contact', data: null },
            { status: 400 }
          );
        }
        const { data, error } = await supabase
          .from('contacts')
          .select('contact_id,full_name,email,phone')
          .eq('organization_id', organizationId)
          .ilike('full_name', `%${search_term}%`);
        if (error) throw error;
        result = data || [];
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown query type: ${query_type}. Use: devices, locations, contacts, tickets, summary, find_device, find_contact`,
            data: null,
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Agents/Organizations/Lookup] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}`, data: null },
      { status: 500 }
    );
  }
}

