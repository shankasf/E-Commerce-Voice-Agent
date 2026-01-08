/**
 * API Route: Create Device Connection
 * POST /api/client-application/device-connections/create
 *
 * Creates a secure device connection with 6-digit pairing code and WebSocket URL.
 *
 * SECURITY:
 * - Only accepts requests from Python AI backend (API key + IP whitelist)
 * - Validates active web session exists
 * - Generates cryptographically secure pairing codes
 *
 * SESSION CLEANUP:
 * When a web session is invalidated/expires, a background job should:
 * UPDATE device_connections SET is_active = false, disconnected_at = NOW()
 * WHERE user_id IN (SELECT user_id FROM sessions WHERE is_active = false)
 * AND is_active = true
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import type { CreateDeviceConnectionRequest, CreateDeviceConnectionResponse } from '../../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const aiServiceApiKey = process.env.AI_SERVICE_API_KEY || '';
const aiServiceAllowedIPs = (process.env.AI_SERVICE_ALLOWED_IPS || '').split(',');
const wsBaseUrl = process.env.WS_BASE_URL || '';

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required Supabase environment variables');
}

if (!aiServiceApiKey || !wsBaseUrl) {
  console.error('Missing required AI service configuration');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Generate a cryptographically secure 6-digit alphanumeric code (uppercase)
 */
function generateSecureCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(6);
  let code = '';

  for (let i = 0; i < 6; i++) {
    const randomIndex = bytes[i] % chars.length;
    code += chars[randomIndex];
  }

  return code;
}

/**
 * Check if code is unique among active connections
 */
async function isCodeUnique(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('device_connections')
    .select('six_digit_code')
    .eq('six_digit_code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error checking code uniqueness:', error);
    return false;
  }

  return data === null;
}

/**
 * Generate unique 6-digit code with retries
 */
async function generateUniqueCode(maxRetries: number = 5): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateSecureCode();
    const isUnique = await isCodeUnique(code);

    if (isUnique) {
      return code;
    }

    console.warn(`Code collision detected (attempt ${i + 1}/${maxRetries}): ${code}`);
  }

  return null;
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate AI Service Authentication (API Key + IP Whitelist)
    const apiKey = request.headers.get('x-ai-service-key');
    const clientIP = getClientIP(request);

    console.log(`[Device Connection] Request from IP: ${clientIP}`);

    // Validate API key
    if (!apiKey || apiKey !== aiServiceApiKey) {
      console.error('[Device Connection] Unauthorized: Invalid API key');
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Unauthorized: Invalid AI service credentials',
        },
        { status: 401 }
      );
    }

    // Validate IP whitelist (skip in development if unknown)
    if (clientIP !== 'unknown' && !aiServiceAllowedIPs.includes(clientIP)) {
      console.error(`[Device Connection] Forbidden: IP ${clientIP} not whitelisted`);
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Forbidden: IP address not authorized',
        },
        { status: 403 }
      );
    }

    // Step 2: Parse request body
    const body: CreateDeviceConnectionRequest = await request.json();
    const { user_id, organization_id, device_id, session_token } = body;

    // Validate required fields
    if (!user_id || !organization_id || !device_id || !session_token) {
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Missing required fields: user_id, organization_id, device_id, session_token',
        },
        { status: 400 }
      );
    }

    console.log(`[Device Connection] Creating connection for user ${user_id}, device ${device_id}`);

    // Step 3: Validate active web session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('session_id, user_id, organization_id, is_active, expires_at')
      .eq('session_token', session_token)
      .eq('user_id', user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (sessionError) {
      console.error('[Device Connection] Session query error:', sessionError);
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Failed to validate session',
        },
        { status: 500 }
      );
    }

    if (!session) {
      console.error('[Device Connection] No active session found');
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'No active web session found for this user',
        },
        { status: 401 }
      );
    }

    // Check if session is expired
    const sessionExpiry = new Date(session.expires_at);
    if (sessionExpiry <= new Date()) {
      console.error('[Device Connection] Session expired');
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Web session has expired',
        },
        { status: 401 }
      );
    }

    // Validate organization matches session
    if (session.organization_id !== organization_id) {
      console.error('[Device Connection] Organization mismatch');
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Organization ID does not match session',
        },
        { status: 403 }
      );
    }

    console.log('[Device Connection] Session validated successfully');

    // Step 4: Validate device exists and belongs to organization
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('device_id, asset_name, organization_id')
      .eq('device_id', device_id)
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (deviceError || !device) {
      console.error('[Device Connection] Device not found:', deviceError);
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Device not found or does not belong to this organization',
        },
        { status: 404 }
      );
    }

    console.log(`[Device Connection] Device validated: ${device.asset_name}`);

    // Step 5: Generate unique 6-digit code
    const code = await generateUniqueCode();

    if (!code) {
      console.error('[Device Connection] Failed to generate unique code after retries');
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Failed to generate unique pairing code. Please try again.',
        },
        { status: 500 }
      );
    }

    console.log(`[Device Connection] Generated unique code: ${code}`);

    // Step 6: Generate session ID and WebSocket URL
    const sessionId = uuidv4();
    const websocketUrl = `wss://${wsBaseUrl}/ws/device/${sessionId}?code=${code}`;

    console.log(`[Device Connection] WebSocket URL: ${websocketUrl}`);

    // Step 7: Insert device connection record
    const { data: connection, error: insertError } = await supabase
      .from('device_connections')
      .insert({
        device_id: device_id,
        user_id: user_id,
        organization_id: organization_id,
        connection_url: websocketUrl,
        session_id: sessionId,
        six_digit_code: code,
        is_active: true,
        connected_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('connection_id')
      .single();

    if (insertError || !connection) {
      console.error('[Device Connection] Failed to create connection:', insertError);
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Failed to create device connection record',
        },
        { status: 500 }
      );
    }

    console.log(`[Device Connection] ✅ Connection created successfully (ID: ${connection.connection_id})`);

    // Step 8: Return success response
    return NextResponse.json<CreateDeviceConnectionResponse>({
      success: true,
      code: code,
      session_id: sessionId,
      websocket_url: websocketUrl,
      expires_in_seconds: 900, // 15 minutes
    });
  } catch (error: any) {
    console.error('[Device Connection] Unexpected error:', error);
    return NextResponse.json<CreateDeviceConnectionResponse>(
      {
        success: false,
        error: `Connection creation failed: ${error.message || 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
