/**
 * API Route: Agent Organizations CRUD
 * /api/agents/organizations
 *
 * Provides CRUD operations for organizations used by AI agents.
 * All requests require x-ai-service-key header for authentication.
 *
 * GET /api/agents/organizations?u_e_code=1234
 * GET /api/agents/organizations?name=CompanyName
 * POST /api/agents/organizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const aiServiceApiKey = process.env.AI_SERVICE_API_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Agents/Organizations] Missing required Supabase environment variables');
}

if (!aiServiceApiKey) {
  console.error('[Agents/Organizations] Missing AI_SERVICE_API_KEY');
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
 * GET /api/agents/organizations
 * Query organizations by u_e_code or name
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authError = validateAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const u_e_code = searchParams.get('u_e_code');
    const name = searchParams.get('name');

    // Build query
    let query = supabase
      .from('organizations')
      .select('organization_id,name,u_e_code,manager:manager_id(full_name,email,phone)');

    if (u_e_code) {
      const code = parseInt(u_e_code, 10);
      if (isNaN(code)) {
        return NextResponse.json(
          {
            success: false,
            error: 'U&E code must be numeric',
            data: null,
          },
          { status: 400 }
        );
      }
      query = query.eq('u_e_code', code);
    } else if (name) {
      query = query.ilike('name', `%${name}%`).limit(5);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing query parameter: u_e_code or name is required',
          data: null,
        },
        { status: 400 }
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Agents/Organizations] Query error:', error);
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
          message: u_e_code 
            ? `No organization found with U&E code: ${u_e_code}`
            : `No organization found with name: ${name}`,
        },
        { status: 200 }
      );
    }

    // Format response similar to AI service format
    const formatted = data.map((org: any) => ({
      organization_id: org.organization_id,
      name: org.name,
      u_e_code: org.u_e_code,
      manager: org.manager || null,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error('[Agents/Organizations] Unexpected error:', error);
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
 * POST /api/agents/organizations
 * Create a new organization
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authError = validateAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const { name, u_e_code } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization name is required',
          data: null,
        },
        { status: 400 }
      );
    }

    if (!u_e_code || isNaN(parseInt(String(u_e_code), 10))) {
      return NextResponse.json(
        {
          success: false,
          error: 'U&E code is required and must be numeric',
          data: null,
        },
        { status: 400 }
      );
    }

    // Check if organization with this U&E code already exists
    const { data: existing } = await supabase
      .from('organizations')
      .select('organization_id')
      .eq('u_e_code', parseInt(String(u_e_code), 10))
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `Organization with U&E code ${u_e_code} already exists`,
          data: null,
        },
        { status: 409 }
      );
    }

    // Create organization
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        u_e_code: parseInt(String(u_e_code), 10),
      })
      .select('organization_id,name,u_e_code')
      .single();

    if (error) {
      console.error('[Agents/Organizations] Insert error:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to create organization: ${error.message}`,
          data: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        organization_id: data.organization_id,
        name: data.name,
        u_e_code: data.u_e_code,
      },
      message: `Organization created successfully. organization_id: ${data.organization_id}`,
    });
  } catch (error: any) {
    console.error('[Agents/Organizations] Unexpected error:', error);
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

