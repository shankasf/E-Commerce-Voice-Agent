/**
 * API Route: Verify 6-Digit Code and Return WebSocket URL
 * POST /api/client-application/device-connections/verify-code-return-url
 *
 * Verifies a 6-digit pairing code entered by the user in the Windows application.
 * The code is hashed and compared against the stored hash in the database.
 * If valid, returns the WebSocket URL and marks the connection as active.
 *
 * SECURITY:
 * - No API key required (called by Windows application)
 * - Codes are verified using SHA-256 hash comparison
 * - Codes expire after 15 minutes
 * - Codes can only be used once (marked as active after verification)
 *
 * FLOW:
 * 1. Windows application receives 6-digit code from user
 * 2. Windows application calls this endpoint with user_id, device_id, organization_id, and code
 * 3. Endpoint hashes the provided code and looks up matching record
 * 4. Validates all parameters match (user_id, device_id, organization_id)
 * 5. Checks if code is expired or already used
 * 6. Marks connection as active (is_active = TRUE)
 * 7. Returns WebSocket URL for connection
 *
 * @module device-connections/verify-code-return-url
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { VerifyCodeRequest, VerifyCodeResponse } from '../../types';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

// Validate critical environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Verify Code] Missing required Supabase environment variables');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Hash a code using SHA-256 (one-way hash)
 * Normalizes to uppercase for consistency
 * 
 * @param code - Original 6-digit code
 * @returns SHA-256 hash of the code (hex string)
 */
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase().trim()).digest('hex');
}

/**
 * Check if a code has expired (15 minutes from creation)
 * 
 * @param created_at - ISO timestamp string of when code was created
 * @returns true if code is expired, false if still valid
 */
function isCodeExpired(created_at: string): boolean {
  const createdAt = new Date(created_at);
  const now = new Date();
  const expirationTime = 15 * 60 * 1000; // 15 minutes in milliseconds
  return (now.getTime() - createdAt.getTime()) > expirationTime;
}

/**
 * Calculate remaining seconds until code expiration
 * 
 * @param created_at - ISO timestamp string of when code was created
 * @returns Number of seconds remaining (0 if expired)
 */
function getRemainingSeconds(created_at: string): number {
  const createdAt = new Date(created_at);
  const now = new Date();
  const expirationTime = 15 * 60 * 1000; // 15 minutes in milliseconds
  const elapsed = now.getTime() - createdAt.getTime();
  const remaining = Math.max(0, Math.floor((expirationTime - elapsed) / 1000));
  return remaining;
}

/**
 * Main POST handler for verifying 6-digit pairing codes
 * 
 * @param request - Next.js request object
 * @returns JSON response with websocket_url, session_id, and expires_in_seconds
 */
export async function POST(request: NextRequest): Promise<NextResponse<VerifyCodeResponse>> {
  try {
    // Step 1: Parse request body
    let body: VerifyCodeRequest;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('[Verify Code] JSON parse error:', parseError);
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { user_id, device_id, organization_id, six_digit_code } = body;

    // Step 2: Validate required fields (explicitly check for undefined/null)
    if (
      user_id === undefined || user_id === null ||
      device_id === undefined || device_id === null ||
      organization_id === undefined || organization_id === null ||
      !six_digit_code || typeof six_digit_code !== 'string'
    ) {
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Missing required fields: user_id, device_id, organization_id, six_digit_code' },
        { status: 400 }
      );
    }

    // Step 3: Type validation
    if (
      typeof user_id !== 'number' ||
      typeof device_id !== 'number' ||
      typeof organization_id !== 'number' ||
      typeof six_digit_code !== 'string'
    ) {
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Invalid field types: user_id, device_id, organization_id must be numbers, six_digit_code must be a string' },
        { status: 400 }
      );
    }

    // Step 4: Validate code format (6 alphanumeric characters)
    const normalizedCode = six_digit_code.toUpperCase().trim();
    const codeRegex = /^[A-Z0-9]{6}$/;
    if (!codeRegex.test(normalizedCode)) {
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Invalid code format: code must be 6 alphanumeric characters' },
        { status: 400 }
      );
    }

    console.log(`[Verify Code] Verifying code for user_id=${user_id}, device_id=${device_id}, organization_id=${organization_id}`);

    // Step 5: Hash the provided code
    const hashedCode = hashCode(normalizedCode);

    // Step 6: Look up connection by hashed code and parameters
    const { data: connection, error: lookupError } = await supabase
      .from('device_connections')
      .select('connection_id, session_id, connection_url, is_active, created_at, user_id, device_id, organization_id')
      .eq('six_digit_code', hashedCode)
      .eq('user_id', user_id)
      .eq('device_id', device_id)
      .eq('organization_id', organization_id)
      .eq('is_active', false) // Only match inactive (pending) connections
      .maybeSingle();

    if (lookupError) {
      console.error('[Verify Code] Database lookup error:', lookupError);
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Database error while verifying code' },
        { status: 500 }
      );
    }

    // Step 7: Check if code was found
    if (!connection) {
      console.warn(`[Verify Code] Code not found or parameters don't match`);
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Invalid code or code does not match the provided parameters' },
        { status: 404 }
      );
    }

    // Step 8: Check if code is already active (already used)
    if (connection.is_active) {
      console.warn(`[Verify Code] Code already used for connection_id=${connection.connection_id}`);
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'This code has already been used. Connection is already active.' },
        { status: 409 }
      );
    }

    // Step 9: Check if code has expired
    if (isCodeExpired(connection.created_at)) {
      console.warn(`[Verify Code] Code expired for connection_id=${connection.connection_id}`);
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Code has expired. Please request a new code.' },
        { status: 410 }
      );
    }

    // Step 10: Mark code as used (set is_active = true and update timestamps)
    const { error: updateError } = await supabase
      .from('device_connections')
      .update({
        is_active: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('connection_id', connection.connection_id);

    if (updateError) {
      console.error('[Verify Code] Error updating connection:', updateError);
      return NextResponse.json<VerifyCodeResponse>(
        { success: false, error: 'Failed to activate connection' },
        { status: 500 }
      );
    }

    // Step 11: Calculate remaining expiration time
    const remainingSeconds = getRemainingSeconds(connection.created_at);

    console.log(`[Verify Code] Code verified successfully for connection_id=${connection.connection_id}, session_id=${connection.session_id}`);

    // Step 12: Return success response with WebSocket URL
    return NextResponse.json<VerifyCodeResponse>(
      {
        success: true,
        websocket_url: connection.connection_url,
        session_id: connection.session_id,
        expires_in_seconds: remainingSeconds,
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Catch-all error handler
    console.error('[Verify Code] Unexpected error:', error);
    return NextResponse.json<VerifyCodeResponse>(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}

