/**
 * API Route: Agent Devices CRUD
 * /api/agents/devices
 *
 * Provides CRUD operations for devices used by AI agents.
 * All requests require x-ai-service-key header for authentication.
 *
 * GET /api/agents/devices?asset_name=DeviceName
 * GET /api/agents/devices?device_id=123
 * GET /api/agents/devices?contact_id=456
 * GET /api/agents/devices?organization_id=789
 * GET /api/agents/devices?asset_name=DeviceName&organization_id=789
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const aiServiceApiKey = process.env.AI_SERVICE_API_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Agents/Devices] Missing required Supabase environment variables');
}

if (!aiServiceApiKey) {
  console.error('[Agents/Devices] Missing AI_SERVICE_API_KEY');
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
 * GET /api/agents/devices
 * Query devices by various criteria
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authError = validateAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const device_id = searchParams.get('device_id');
    const asset_name = searchParams.get('asset_name');
    const contact_id = searchParams.get('contact_id');
    const organization_id = searchParams.get('organization_id');
    const status_only = searchParams.get('status_only') === 'true'; // For get_device_status

    // Case 1: Get device by ID (with optional status_only flag)
    if (device_id) {
      const id = parseInt(device_id, 10);
      if (isNaN(id)) {
        return NextResponse.json(
          {
            success: false,
            error: 'device_id must be numeric',
            data: null,
          },
          { status: 400 }
        );
      }

      let selectFields = 'device_id,asset_name,status,host_name,public_ip,organization:organization_id(name,u_e_code)';
      
      if (!status_only) {
        // Full device details
        selectFields = '*';
      }

      const { data, error } = await supabase
        .from('devices')
        .select(selectFields)
        .eq('device_id', id)
        .maybeSingle();

      if (error) {
        console.error('[Agents/Devices] Query error:', error);
        return NextResponse.json(
          {
            success: false,
            error: `Database error: ${error.message}`,
            data: null,
          },
          { status: 500 }
        );
      }

      if (!data) {
        return NextResponse.json(
          {
            success: true,
            data: null,
            message: `No device found with device_id: ${device_id}`,
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data,
      });
    }

    // Case 2: Get devices by contact_id
    if (contact_id) {
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

      const { data, error } = await supabase
        .from('contact_devices')
        .select('device:device_id(device_id,asset_name,status,host_name)')
        .eq('contact_id', id)
        .is('unassigned_at', null);

      if (error) {
        console.error('[Agents/Devices] Query error:', error);
        return NextResponse.json(
          {
            success: false,
            error: `Database error: ${error.message}`,
            data: null,
          },
          { status: 500 }
        );
      }

      const devices = (data || []).map((item: any) => item.device).filter(Boolean);

      return NextResponse.json({
        success: true,
        data: devices,
      });
    }

    // Case 3: Get devices by organization_id
    if (organization_id) {
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

      let query = supabase
        .from('devices')
        .select('device_id,asset_name,status,host_name,public_ip,organization:organization_id(name,u_e_code)')
        .eq('organization_id', id);

      // If asset_name is also provided, filter by it
      if (asset_name) {
        query = query.ilike('asset_name', `%${asset_name}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Agents/Devices] Query error:', error);
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
    }

    // Case 4: Get device by asset_name only
    if (asset_name) {
      const { data, error } = await supabase
        .from('devices')
        .select('device_id,asset_name,status,host_name,public_ip,organization:organization_id(name,u_e_code)')
        .ilike('asset_name', `%${asset_name}%`);

      if (error) {
        console.error('[Agents/Devices] Query error:', error);
        return NextResponse.json(
          {
            success: false,
            error: `Database error: ${error.message}`,
            data: null,
          },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        return NextResponse.json(
          {
            success: true,
            data: [],
            message: `No device found with name: ${asset_name}`,
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data,
      });
    }

    // No valid query parameters
    return NextResponse.json(
      {
        success: false,
        error: 'Missing query parameter: device_id, asset_name, contact_id, or organization_id is required',
        data: null,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Agents/Devices] Unexpected error:', error);
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

