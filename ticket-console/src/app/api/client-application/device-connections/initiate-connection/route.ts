/**
 * API Route: Initiate Device Connection
 * POST /api/client-application/device-connections/initiate-connection
 *
 * Called by Windows application to validate 6-digit code and get WebSocket URL.
 *
 * SECURITY:
 * - Validates 6-digit code by hashing input and comparing with DB
 * - Verifies user_id, org_id, device_id match the stored connection
 * - Checks code is not expired (15 minutes from creation)
 * - Checks connection is not already active
 *
 * FLOW:
 * 1. Windows app calls this with 6-digit code + context
 * 2. Hash the input code, lookup in DB
 * 3. Validate all parameters match
 * 4. Return WebSocket URL if valid
 * 5. is_active remains FALSE (WebSocket handler sets TRUE on connect)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { InitiateConnectionRequest, InitiateConnectionResponse } from '../../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required Supabase environment variables');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Code expiration time in milliseconds (15 minutes)
const CODE_EXPIRATION_MS = 15 * 60 * 1000;

/**
 * Hash a 6-digit code using SHA-256 (same as create endpoint)
 */
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse request body
    const body: InitiateConnectionRequest = await request.json();
    const { code, user_id, organization_id, device_id } = body;

    // Validate required fields
    if (!code || !user_id || !organization_id || !device_id) {
      return NextResponse.json<InitiateConnectionResponse>(
        {
          success: false,
          error: 'Missing required fields: code, user_id, organization_id, device_id',
        },
        { status: 400 }
      );
    }

    // Validate code format (6 alphanumeric characters)
    const codeRegex = /^[A-Z0-9]{6}$/i;
    if (!codeRegex.test(code)) {
      return NextResponse.json<InitiateConnectionResponse>(
        {
          success: false,
          error: 'Invalid code format. Code must be 6 alphanumeric characters.',
        },
        { status: 400 }
      );
    }

    console.log(`[Initiate Connection] Validating code for user ${user_id}, device ${device_id}`);

    // Step 2: Hash the input code
    const hashedCode = hashCode(code);

    // Step 3: Lookup the connection by hashed code
    const { data: connection, error: connectionError } = await supabase
      .from('device_connections')
      .select('connection_id, user_id, organization_id, device_id, connection_url, session_id, chat_session_id, is_active, created_at')
      .eq('six_digit_code', hashedCode)
      .maybeSingle();

    if (connectionError) {
      console.error('[Initiate Connection] Database error:', connectionError);
      return NextResponse.json<InitiateConnectionResponse>(
        {
          success: false,
          error: 'Database error while validating code',
        },
        { status: 500 }
      );
    }

    // Step 4: Check if connection exists
    if (!connection) {
      console.warn('[Initiate Connection] Invalid code - not found in database');
      return NextResponse.json<InitiateConnectionResponse>(
        {
          success: false,
          error: 'Invalid code. Please check and try again.',
        },
        { status: 401 }
      );
    }

    // Step 5: Check if connection is already active
    if (connection.is_active) {
      console.warn('[Initiate Connection] Code already used - connection is active');
      return NextResponse.json<InitiateConnectionResponse>(
        {
          success: false,
          error: 'This code has already been used. Please request a new code.',
        },
        { status: 409 }
      );
    }

    // Step 6: Check if code is expired (15 minutes)
    const createdAt = new Date(connection.created_at).getTime();
    const now = Date.now();
    if (now - createdAt > CODE_EXPIRATION_MS) {
      console.warn('[Initiate Connection] Code expired');
      return NextResponse.json<InitiateConnectionResponse>(
        {
          success: false,
          error: 'Code has expired. Please request a new code.',
        },
        { status: 410 }
      );
    }

    // Step 7: Validate user_id, organization_id, device_id match
    if (connection.user_id !== user_id) {
      console.warn('[Initiate Connection] User ID mismatch');
      return NextResponse.json<InitiateConnectionResponse>(
        {
          success: false,
          error: 'Invalid code. User does not match.',
        },
        { status: 403 }
      );
    }

    if (connection.organization_id !== organization_id) {
      console.warn('[Initiate Connection] Organization ID mismatch');
      return NextResponse.json<InitiateConnectionResponse>(
        {
          success: false,
          error: 'Invalid code. Organization does not match.',
        },
        { status: 403 }
      );
    }

    if (connection.device_id !== device_id) {
      console.warn('[Initiate Connection] Device ID mismatch');
      return NextResponse.json<InitiateConnectionResponse>(
        {
          success: false,
          error: 'Invalid code. Device does not match.',
        },
        { status: 403 }
      );
    }

    console.log(`[Initiate Connection] Code validated successfully for connection ${connection.connection_id}`);

    // Step 8: Update the connection record to mark it as validated (but not yet active)
    const { error: updateError } = await supabase
      .from('device_connections')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('connection_id', connection.connection_id);

    if (updateError) {
      console.error('[Initiate Connection] Failed to update connection:', updateError);
      // Non-fatal error, continue with response
    }

    // Step 9: Return success with WebSocket URL and chat_session_id
    return NextResponse.json<InitiateConnectionResponse>({
      success: true,
      websocket_url: connection.connection_url,
      session_id: connection.session_id,
      chat_session_id: connection.chat_session_id,
    });
  } catch (error: any) {
    console.error('[Initiate Connection] Unexpected error:', error);
    return NextResponse.json<InitiateConnectionResponse>(
      {
        success: false,
        error: `Connection initiation failed: ${error.message || 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
