// Verify 6-digit code and return WebSocket URL from database
// Code is stored as HASH - we hash the input and compare
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { VerifyCodeRequest, VerifyCodeResponse } from '@/lib/types/device-connections';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
});

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Verify Code] Missing Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      });
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const body: VerifyCodeRequest = await request.json();
    const { user_id, device_id, organization_id, six_digit_code } = body;

    // Validation - code is required, but user_id/device_id/org_id are optional
    if (!six_digit_code) {
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: '6-digit code is required' },
        { status: 400 }
      );
    }

    const code = six_digit_code.trim().toUpperCase();
    
    if (code.length !== 6) {
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Invalid code format' },
        { status: 400 }
      );
    }

    // Look up connection in database
    // Note: six_digit_code is stored as HASH, so we can't use .eq() directly
    // If user_id/device_id/org_id are provided, filter by them. Otherwise, search all unverified codes.
    let query = supabase
      .from('device_connections')
      .select('*')
      .gt('expires_at', new Date().toISOString()) // Not expired
      .is('verified_at', null) // Not already verified
      .order('created_at', { ascending: false }); // Get most recent codes first

    // If user_id/device_id/org_id are provided, filter by them for faster lookup
    if (user_id && device_id && organization_id) {
      query = query.eq('user_id', user_id)
                   .eq('device_id', device_id)
                   .eq('organization_id', organization_id);
    }

    const { data: connections, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Verify Code] Database query error:', fetchError);
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Database error: ' + fetchError.message },
        { status: 500 }
      );
    }

    if (fetchError || !connections || connections.length === 0) {
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Invalid or expired code' },
        { status: 404 }
      );
    }

    // Find the connection with matching hashed code
    let connection = null;
    try {
      console.log(`[Verify Code] Searching through ${connections.length} unverified codes for code: ${code}`);
      for (const conn of connections) {
        if (conn.six_digit_code) {
          try {
            // Compare the provided code with the hashed code in database
            const isMatch = await bcrypt.compare(code, conn.six_digit_code);
            if (isMatch) {
              console.log(`[Verify Code] Found matching code for connection ${conn.connection_id}, session: ${conn.session_id}`);
              connection = conn;
              break;
            }
          } catch (bcryptError) {
            console.error(`[Verify Code] bcrypt.compare error for connection ${conn.connection_id}:`, bcryptError);
            // Continue to next connection
            continue;
          }
        }
      }
      
      if (!connection) {
        console.log(`[Verify Code] No matching code found after checking ${connections.length} connections`);
      }
    } catch (error) {
      console.error('[Verify Code] Error in bcrypt comparison loop:', error);
      throw error;
    }

    if (!connection) {
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Invalid code' },
        { status: 404 }
      );
    }

    // Calculate remaining time
    const expiresAt = new Date(connection.expires_at);
    const now = new Date();
    const expiresInSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    if (expiresInSeconds === 0) {
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Code has expired' },
        { status: 400 }
      );
    }

    // Clear code after successful verification (one-time use)
    // We don't delete the row because WebSocket server needs session_id lookup
    // Instead, we null the code field to invalidate it
    const { error: updateError } = await supabase
      .from('device_connections')
      .update({
        six_digit_code: null, // Clear code - one-time use
        verified_at: new Date().toISOString(), // Track verification time
      })
      .eq('connection_id', connection.connection_id);

    if (updateError) {
      console.warn(`[Verify Code] Failed to clear code after verification: ${updateError.message}`);
      // Continue anyway - code verification succeeded
    }

    console.log(`[Verify Code] Code: ${code} verified and cleared. Session: ${connection.session_id}, User: ${user_id}, Device: ${device_id}`);

    // Map connection_url (coworker's schema) to websocket_url (response format)
    const websocketUrl = connection.connection_url || connection.websocket_url;
    
    return NextResponse.json<VerifyCodeResponse>({
      success: true,
      websocket_url: websocketUrl,
      session_id: connection.session_id,
      user_id: connection.user_id,
      device_id: connection.device_id,
      organization_id: connection.organization_id,
      expires_in_seconds: expiresInSeconds
    });
  } catch (error: any) {
    console.error('[Verify Code] Error:', error);
    console.error('[Verify Code] Error stack:', error?.stack);
    console.error('[Verify Code] Error details:', JSON.stringify(error, null, 2));
    
    // Return more detailed error for debugging
    return NextResponse.json<VerifyCodeResponse>(
      { 
        success: false, 
        error: error?.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
