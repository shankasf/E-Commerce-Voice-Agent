/**
 * API Route: Get Organization Account Manager
 * GET /api/agents/organizations/[organizationId]/account-manager
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

    const { data: org, error } = await supabase
      .from('organizations')
      .select('organization_id,name,manager:manager_id(full_name,email,phone)')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}`, data: null },
        { status: 500 }
      );
    }

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found', data: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        organization_id: org.organization_id,
        organization_name: org.name,
        account_manager: org.manager || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error.message}`, data: null },
      { status: 500 }
    );
  }
}

