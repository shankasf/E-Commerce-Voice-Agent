// API Route to validate U&E code and get organization details
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
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
    // First get the organization without foreign key (simpler query)
    const { data: org, error } = await supabase
      .from('organizations')
      .select('organization_id, name, u_e_code, manager_id')
      .eq('u_e_code', ueCode)
      .single();

    if (error || !org) {
      console.error('[Validate U&E Code] Query error:', error);
      return NextResponse.json({
        success: false,
        error: "I'm sorry, I could not find that U E code in our system. Please contact your organization administrator to get your U E code and come back again. Thank you."
      }, { status: 404 });
    }

    // Get manager details separately if manager_id exists
    let manager = {};
    if (org.manager_id) {
      const { data: managerData } = await supabase
        .from('support_agents')
        .select('support_agent_id, full_name, email, phone')
        .eq('support_agent_id', org.manager_id)
        .single();
      
      if (managerData) {
        manager = {
          manager_id: managerData.support_agent_id,
          full_name: managerData.full_name,
          email: managerData.email,
          phone: managerData.phone,
        };
      }
    }

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
