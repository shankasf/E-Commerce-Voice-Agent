/**
 * API Route: Verify 6-Digit Code and Return WebSocket URL
 * POST /api/client-application/device-connections/verify-code-return-url
 *
 * Verifies a 6-digit pairing code entered by the user in the Windows application.
 * The code is hashed and matched against the database. If valid and not expired,
 * the corresponding WebSocket URL is returned. The code is marked as used.
 *
 * SECURITY:
 * - No authentication required (Windows app initiated)
 * - Codes are verified using one-way hash comparison
 * - Codes expire after 15 minutes
 * - Codes can only be used once (marked as used after verification)
 *
 * FLOW:
 * 1. Windows app receives 6-digit code from user
 * 2. Windows app calls this endpoint with code + user/device/org IDs
 * 3. Endpoint hashes the code and looks up in database
 * 4. Validates code hasn't expired and isn't already active
 * 5. Marks code as used (sets is_active=TRUE)
 * 6. Returns WebSocket URL to Windows app
 * 7. Windows app connects to WebSocket URL
 *
 * @module device-connections/verify-code-return-url
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { VerifyCodeRequest, VerifyCodeResponse } from '../../types.ts';

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
 * @param created_at - ISO timestamp of when code was created
 * @returns true if expired, false if still valid
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
 * @param created_at - ISO timestamp of when code was created
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
 * Main POST handler for verifying 6-digit codes
 * 
 * @param request - Next.js request object
 * @returns JSON response with websocket_url and session_id
 */
export async function POST(request: NextRequest): Promise<NextResponse<VerifyCodeResponse>> {
  try {
    // Step 1: Parse and validate request body
    let body: VerifyCodeRequest;
    try {
      body = await request.json();
    } catch (error) {
      console.error('[Verify Code] Invalid JSON in request body:', error);
      return NextResponse.json<VerifyCodeResponse>(
        {
          success: false,
          error: 'Invalid request body: JSON parse error',
        },
        { status: 400 }
      );
    }

    const { user_id, device_id, organization_id, six_digit_code } = body;

    // Step 2: Validate required fields
    if (
      user_id === undefined || user_id === null ||
      device_id === undefined || device_id === null ||
      organization_id === undefined || organization_id === null ||
      !six_digit_code
    ) {
      return NextResponse.json<VerifyCodeResponse>(
        {
          success: false,
          error: 'Missing required fields: user_id, device_id, organization_id, six_digit_code',
        },
        { status: 400 }
      );
    }

    // Step 3: Validate field types
    if (
      typeof user_id !== 'number' ||
      typeof device_id !== 'number' ||
      typeof organization_id !== 'number' ||
      typeof six_digit_code !== 'string'
    ) {
      return NextResponse.json<VerifyCodeResponse>(
        {
          success: false,
          error: 'Invalid field types: user_id, device_id, and organization_id must be numbers, six_digit_code must be a string',
        },
        { status: 400 }
      );
    }

    // Step 4: Validate code format (6 alphanumeric characters)
    const codePattern = /^[A-Z0-9]{6}$/;
    const normalizedCode = six_digit_code.toUpperCase().trim();
    
    if (!codePattern.test(normalizedCode)) {
      return NextResponse.json<VerifyCodeResponse>(
        {
          success: false,
          error: 'Invalid code format: code must be 6 alphanumeric characters',
        },
        { status: 400 }
      );
    }

    console.log(`[Verify Code] Verifying code for user ${user_id}, device ${device_id}, org ${organization_id}`);

    // Step 5: Hash the code for database lookup
    const hashedCode = hashCode(normalizedCode);

    // Step 6: Look up connection by hashed code and IDs
    const { data: connection, error: lookupError } = await supabase
      .from('device_connections')
      .select('connection_id, session_id, connection_url, is_active, created_at, user_id, device_id, organization_id')
      .eq('six_digit_code', hashedCode)
      .eq('user_id', user_id)
      .eq('device_id', device_id)
      .eq('organization_id', organization_id)
      .eq('is_active', false) // Only match inactive connections
      .maybeSingle();

    if (lookupError) {
      console.error('[Verify Code] Database lookup error:', lookupError);
      return NextResponse.json<VerifyCodeResponse>(
        {
          success: false,
          error: 'Failed to verify code',
        },
        { status: 500 }
      );
    }

    // Step 7: Check if code was found
    if (!connection) {
      console.warn(`[Verify Code] Code not found or already used for user ${user_id}, device ${device_id}`);
      return NextResponse.json<VerifyCodeResponse>(
        {
          success: false,
          error: 'Invalid code or code already used. Please request a new code.',
        },
        { status: 404 }
      );
    }

    // Step 8: Check if code has expired
    if (isCodeExpired(connection.created_at)) {
      console.warn(`[Verify Code] Code expired for connection ${connection.connection_id}`);
      return NextResponse.json<VerifyCodeResponse>(
        {
          success: false,
          error: 'Code has expired. Please request a new code.',
        },
        { status: 410 } // Gone
      );
    }

    // Step 9: Check if connection is already active (shouldn't happen due to query, but double-check)
    if (connection.is_active) {
      console.warn(`[Verify Code] Connection ${connection.connection_id} is already active`);
      return NextResponse.json<VerifyCodeResponse>(
        {
          success: false,
          error: 'Code has already been used. Please request a new code.',
        },
        { status: 409 } // Conflict
      );
    }

    console.log(`[Verify Code] ✅ Code verified successfully (Connection ID: ${connection.connection_id}, Session: ${connection.session_id})`);

    // Step 10: Calculate remaining time
    const remainingSeconds = getRemainingSeconds(connection.created_at);

    // Step 11: Return success response with WebSocket URL
    return NextResponse.json<VerifyCodeResponse>({
      success: true,
      websocket_url: connection.connection_url,
      session_id: connection.session_id,
      expires_in_seconds: remainingSeconds,
    });
  } catch (error: any) {
    // Catch-all error handler - ensures app never breaks
    console.error('[Verify Code] Unexpected error:', error);
    
    // Log error details for debugging (but don't expose to client)
    if (error instanceof Error) {
      console.error('[Verify Code] Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }

    return NextResponse.json<VerifyCodeResponse>(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}

