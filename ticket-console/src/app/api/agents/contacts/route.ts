/**
 * API Route: Agent Contacts CRUD
 * /api/agents/contacts
 *
 * Provides CRUD operations for contacts used by AI agents.
 * All requests require x-ai-service-key header for authentication.
 *
 * GET /api/agents/contacts?phone=1234567890
 * GET /api/agents/contacts?name=John&organization_id=1
 * POST /api/agents/contacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const aiServiceApiKey = process.env.AI_SERVICE_API_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Agents/Contacts] Missing required Supabase environment variables');
}

if (!aiServiceApiKey) {
  console.error('[Agents/Contacts] Missing AI_SERVICE_API_KEY');
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
 * Clean phone number for searching
 */
function cleanPhone(phone: string): string {
  return phone.replace(/[-\s()]/g, '');
}

/**
 * GET /api/agents/contacts
 * Query contacts by phone, name, or organization
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authError = validateAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const name = searchParams.get('name');
    const organization_id = searchParams.get('organization_id');

    // Build query
    let query = supabase
      .from('contacts')
      .select('contact_id,organization_id,full_name,email,phone,organization:organization_id(name,u_e_code)');

    if (phone) {
      const clean = cleanPhone(phone);
      // Search for phone numbers that contain the cleaned version
      query = query.or(`phone.ilike.%${clean}%,phone.ilike.%${phone}%`);
    } else if (name && organization_id) {
      query = query
        .eq('organization_id', parseInt(organization_id, 10))
        .ilike('full_name', `%${name}%`)
        .limit(5);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing query parameter: phone, or (name + organization_id) is required',
          data: null,
        },
        { status: 400 }
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Agents/Contacts] Query error:', error);
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
          message: phone 
            ? `No contact found with phone: ${phone}`
            : `No contact found with name: ${name}`,
        },
        { status: 200 }
      );
    }

    // Format response
    const formatted = data.map((contact: any) => ({
      contact_id: contact.contact_id,
      organization_id: contact.organization_id,
      full_name: contact.full_name,
      email: contact.email,
      phone: contact.phone,
      organization: contact.organization || null,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error('[Agents/Contacts] Unexpected error:', error);
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
 * POST /api/agents/contacts
 * Create a new contact
 * 
 * Accepts either organization_id OR u_e_code (U&E code).
 * If u_e_code is provided, looks up the organization_id first.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authError = validateAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const { full_name, phone, organization_id, u_e_code, email } = body;

    // Validate required fields
    if (!full_name || !full_name.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Full name is required',
          data: null,
        },
        { status: 400 }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Phone number is required',
          data: null,
        },
        { status: 400 }
      );
    }

    // Validate that either organization_id OR u_e_code is provided
    if (!organization_id && !u_e_code) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either organization_id or u_e_code is required',
          data: null,
        },
        { status: 400 }
      );
    }

    if (organization_id && u_e_code) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provide either organization_id OR u_e_code, not both',
          data: null,
        },
        { status: 400 }
      );
    }

    let actualOrganizationId: number;

    // If u_e_code provided, look up organization_id first
    if (u_e_code) {
      const code = parseInt(String(u_e_code), 10);
      if (isNaN(code)) {
        return NextResponse.json(
          {
            success: false,
            error: 'u_e_code must be numeric',
            data: null,
          },
          { status: 400 }
        );
      }

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('organization_id')
        .eq('u_e_code', code)
        .maybeSingle();

      if (orgError) {
        console.error('[Agents/Contacts] Organization lookup error:', orgError);
        return NextResponse.json(
          {
            success: false,
            error: `Database error: ${orgError.message}`,
            data: null,
          },
          { status: 500 }
        );
      }

      if (!org) {
        return NextResponse.json(
          {
            success: false,
            error: `Organization with U&E code ${u_e_code} not found`,
            data: null,
          },
          { status: 404 }
        );
      }

      actualOrganizationId = org.organization_id;
    } else {
      // Validate organization_id is numeric
      if (isNaN(parseInt(String(organization_id), 10))) {
        return NextResponse.json(
          {
            success: false,
            error: 'organization_id must be numeric',
            data: null,
          },
          { status: 400 }
        );
      }

      actualOrganizationId = parseInt(String(organization_id), 10);

      // Verify organization exists
      const { data: org } = await supabase
        .from('organizations')
        .select('organization_id')
        .eq('organization_id', actualOrganizationId)
        .maybeSingle();

      if (!org) {
        return NextResponse.json(
          {
            success: false,
            error: `Organization with ID ${actualOrganizationId} not found`,
            data: null,
          },
          { status: 404 }
        );
      }
    }

    // Prepare contact data
    const contactData: any = {
      full_name: full_name.trim(),
      phone: phone.trim(),
      organization_id: actualOrganizationId,
    };

    if (email && email.trim()) {
      contactData.email = email.trim();
    }

    // Create contact
    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select('contact_id,organization_id,full_name,email,phone')
      .single();

    if (error) {
      console.error('[Agents/Contacts] Insert error:', error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          {
            success: false,
            error: 'Contact with this email already exists in this organization',
            data: null,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Failed to create contact: ${error.message}`,
          data: null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        contact_id: data.contact_id,
        organization_id: data.organization_id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
      },
      message: `Contact created successfully.\ncontact_id: ${data.contact_id}\norganization_id: ${data.organization_id}`,
    });
  } catch (error: any) {
    console.error('[Agents/Contacts] Unexpected error:', error);
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

