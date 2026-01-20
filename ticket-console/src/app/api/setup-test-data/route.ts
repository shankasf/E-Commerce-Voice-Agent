// API Route to set up test data in the database
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
    });

    // Check if organizations already exist
    const { data: existingOrgs } = await supabase
      .from('organizations')
      .select('organization_id, name, u_e_code');

    if (existingOrgs && existingOrgs.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Test data already exists',
        organizations: existingOrgs,
        ueCodes: existingOrgs.map(org => org.u_e_code).filter(Boolean),
      });
    }

    // Create test organizations
    const testOrgs = [
      { name: 'ACME Corporation', u_e_code: 10001 },
      { name: 'Test Company Inc', u_e_code: 12345 },
      { name: 'Demo Organization', u_e_code: 99999 },
    ];

    const results = [];
    for (const org of testOrgs) {
      const { data, error } = await supabase
        .from('organizations')
        .insert([org])
        .select()
        .single();

      if (error && !error.message.includes('duplicate')) {
        results.push({ org, error: error.message });
      } else {
        results.push({ org, success: true, data });
      }
    }

    // Get all organizations
    const { data: allOrgs } = await supabase
      .from('organizations')
      .select('organization_id, name, u_e_code')
      .order('organization_id');

    return NextResponse.json({
      success: true,
      message: 'Test data created successfully',
      results,
      organizations: allOrgs || [],
      availableUeCodes: allOrgs?.map(org => org.u_e_code).filter(Boolean) || [],
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
    });

    // Get all organizations with U&E codes
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('organization_id, name, u_e_code')
      .not('u_e_code', 'is', null)
      .order('organization_id');

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organizations: orgs || [],
      availableUeCodes: orgs?.map(org => org.u_e_code) || [],
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
    }, { status: 500 });
  }
}

