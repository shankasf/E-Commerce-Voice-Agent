// Test API route to verify database connection
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    // Check if env vars are loaded
    const envCheck = {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey,
      urlLength: supabaseUrl.length,
      keyLength: supabaseServiceKey.length,
      urlPreview: supabaseUrl.substring(0, 30) + '...',
    };

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        envCheck,
        message: 'Please check your .env.local file and restart the server'
      }, { status: 500 });
    }

    // Try to create client and test connection
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
    });

    // Test query - try to get a simple table
    const { data, error } = await supabase
      .from('organizations')
      .select('organization_id, name, u_e_code')
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        errorDetails: error.message,
        errorCode: error.code,
        envCheck,
      }, { status: 500 });
    }

    // Get count of organizations
    const { count, error: countError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: 'Database connection successful! ✅',
      envCheck,
      testResults: {
        organizationsTable: data !== null ? 'accessible' : 'error',
        organizationsCount: count || 0,
        sampleData: data && data.length > 0 ? data[0] : null,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      message: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    }, { status: 500 });
  }
}

