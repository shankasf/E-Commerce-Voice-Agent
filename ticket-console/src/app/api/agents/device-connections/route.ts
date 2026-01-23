/**
 * API Route: Agent Device Connections
 * /api/agents/device-connections
 *
 * Provides device connection status and management for AI agents.
 * All requests require x-ai-service-key header for authentication.
 *
 * NOTE: This is separate from /api/client-application/device-connections
 * which handles the actual connection creation/verification.
 * This endpoint is for agents to check connection status.
 *
 * GET /api/agents/device-connections?device_id=123
 * GET /api/agents/device-connections?device_id=123&check_remote=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const aiServiceApiKey = process.env.AI_SERVICE_API_KEY || '';
const applicationsBackendUrl = process.env.APPLICATIONS_BACKEND_URL || '';

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Agents/Device-Connections] Missing required Supabase environment variables');
}

if (!aiServiceApiKey) {
  console.error('[Agents/Device-Connections] Missing AI_SERVICE_API_KEY');
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
 * GET /api/agents/device-connections
 * Get device connection status
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authError = validateAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const device_id = searchParams.get('device_id');
    const check_remote = searchParams.get('check_remote') === 'true';

    if (!device_id || isNaN(parseInt(device_id, 10))) {
      return NextResponse.json(
        {
          success: false,
          error: 'device_id query parameter is required and must be numeric',
          data: null,
        },
        { status: 400 }
      );
    }

    const deviceId = parseInt(device_id, 10);

    // Get device connection from database
    const { data: connection, error: connError } = await supabase
      .from('device_connections')
      .select('connection_id,device_id,user_id,organization_id,connection_url,session_id,is_active,connected_at,last_heartbeat')
      .eq('device_id', deviceId)
      .eq('is_active', true)
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (connError) {
      console.error('[Agents/Device-Connections] Query error:', connError);
      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${connError.message}`,
          data: null,
        },
        { status: 500 }
      );
    }

    const response: any = {
      success: true,
      data: {
        device_id: deviceId,
        has_active_connection: !!connection,
        connection: connection ? {
          connection_id: connection.connection_id,
          session_id: connection.session_id,
          is_active: connection.is_active,
          connected_at: connection.connected_at,
          last_heartbeat: connection.last_heartbeat,
        } : null,
      },
    };

    // If check_remote is true, also check Applications Backend connection status
    if (check_remote && applicationsBackendUrl) {
      try {
        // Call Applications Backend to check WebSocket connection
        const backendResponse = await fetch(
          `${applicationsBackendUrl}/api/device/${deviceId}/connection-status`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (backendResponse.ok) {
          const backendData = await backendResponse.json();
          response.data.remote_connection = backendData;
        } else {
          response.data.remote_connection = {
            connected: false,
            error: 'Failed to check remote connection status',
          };
        }
      } catch (error: any) {
        console.error('[Agents/Device-Connections] Remote check error:', error);
        response.data.remote_connection = {
          connected: false,
          error: error.message || 'Failed to connect to Applications Backend',
        };
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Agents/Device-Connections] Unexpected error:', error);
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

