/**
 * API Route: Get Organization Summary
 * GET /api/agents/organizations/[organizationId]/summary
 *
 * Returns a summary of organization data including devices, contacts, locations, and tickets.
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

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('organization_id,name,u_e_code,manager:manager_id(full_name,email,phone)')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (orgError || !org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found', data: null },
        { status: 404 }
      );
    }

    // Get counts
    const [devicesResult, contactsResult, locationsResult, ticketsResult] = await Promise.all([
      supabase.from('devices').select('device_id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('contacts').select('contact_id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('locations').select('location_id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('support_tickets').select('ticket_id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    ]);

    const summary = {
      organization: org,
      counts: {
        devices: devicesResult.count || 0,
        contacts: contactsResult.count || 0,
        locations: locationsResult.count || 0,
        tickets: ticketsResult.count || 0,
      },
    };

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}`, data: null },
      { status: 500 }
    );
  }
}

