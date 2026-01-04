// API Route to validate U&E code and get organization details
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
});

export async function POST(request: NextRequest) {
  try {
    const { ueCode } = await request.json();

    if (!ueCode) {
      return NextResponse.json(
        { success: false, error: 'U&E code is required' },
        { status: 400 }
      );
    }

    // Look up organization by U&E code
    const { data: org, error } = await supabase
      .from('organizations')
      .select(`
        organization_id,
        name,
        u_e_code,
        manager:manager_id(
          manager_id,
          full_name,
          email,
          phone
        )
      `)
      .eq('u_e_code', ueCode)
      .single();

    if (error || !org) {
      return NextResponse.json({
        success: false,
        error: "I'm sorry, I could not find that U E code in our system. Please contact your organization administrator to get your U E code and come back again. Thank you."
      }, { status: 404 });
    }

    const manager = org.manager as any || {};

    return NextResponse.json({
      success: true,
      organization: {
        organization_id: org.organization_id,
        name: org.name,
        u_e_code: org.u_e_code,
      },
      manager: {
        name: manager.full_name || 'Not Assigned',
        email: manager.email || 'N/A',
        phone: manager.phone || 'N/A',
      }
    });
  } catch (error) {
    console.error('Error validating U&E code:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while validating U&E code' },
      { status: 500 }
    );
  }
}
