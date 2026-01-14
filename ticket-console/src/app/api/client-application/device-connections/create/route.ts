/**
 * API Route: Create Device Connection
 * POST /api/client-application/device-connections/create
 *
 * Creates a secure device connection with 6-digit pairing code and WebSocket URL.
 * Called by AI Service (MCP Tool) when user requests a connection code.
 *
 * SECURITY:
 * - Only accepts requests from Python AI backend (API key + IP whitelist)
 * - Generates cryptographically secure pairing codes
 * - Stores HASHED version of 6-digit code (SHA-256)
 * - Returns plain code to AI for display to user
 *
 * FLOW:
 * 1. AI Service calls this endpoint with user/device context
 * 2. Generates unique 6-digit code, hashes it, stores in DB
 * 3. Returns plain code to AI → AI shows to user
 * 4. User enters code in Windows app → Windows calls /initiate-connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import type { CreateDeviceConnectionRequest, CreateDeviceConnectionResponse } from '../../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const aiServiceApiKey = process.env.AI_SERVICE_API_KEY || '';
const aiServiceAllowedIPs = (process.env.AI_SERVICE_ALLOWED_IPS || '127.0.0.1,localhost').split(',');
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
 * Hash a 6-digit code using SHA-256
 */
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

/**
 * Check if hashed code is unique among pending connections (is_active = false, not expired)
 */
async function isHashedCodeUnique(hashedCode: string): Promise<boolean> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('device_connections')
    .select('six_digit_code')
    .eq('six_digit_code', hashedCode)
    .eq('is_active', false)
    .gte('created_at', fifteenMinutesAgo)
    .maybeSingle();

  if (error) {
    console.error('Error checking code uniqueness:', error);
    return false;
  }

  return data === null;
}

/**
 * Generate unique 6-digit code with retries
 * Returns both plain code and hashed code
 */
async function generateUniqueCode(maxRetries: number = 5): Promise<{ plainCode: string; hashedCode: string } | null> {
  for (let i = 0; i < maxRetries; i++) {
    const plainCode = generateSecureCode();
    const hashedCode = hashCode(plainCode);
    const isUnique = await isHashedCodeUnique(hashedCode);

    if (isUnique) {
      return { plainCode, hashedCode };
    }

    console.warn(`Code collision detected (attempt ${i + 1}/${maxRetries})`);
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

    console.log(`[Device Connection Create] Request from IP: ${clientIP}`);

    // Validate API key
    if (!apiKey || apiKey !== aiServiceApiKey) {
      console.error('[Device Connection Create] Unauthorized: Invalid API key');
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Unauthorized: Invalid AI service credentials',
        },
        { status: 401 }
      );
    }

    // Validate IP whitelist (skip in development if unknown)
    const isLocalhost = clientIP === '127.0.0.1' || clientIP === 'localhost' || clientIP === '::1';
    if (clientIP !== 'unknown' && !isLocalhost && !aiServiceAllowedIPs.includes(clientIP)) {
      console.error(`[Device Connection Create] Forbidden: IP ${clientIP} not whitelisted`);
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
    const { user_id, organization_id, device_id, chat_session_id } = body;

    // Validate required fields (chat_session_id is now MANDATORY)
    if (!user_id || !organization_id || !device_id || !chat_session_id) {
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Missing required fields: user_id, organization_id, device_id, chat_session_id',
        },
        { status: 400 }
      );
    }

    console.log(`[Device Connection Create] Creating connection for user ${user_id}, device ${device_id}`);

    // Step 3: Validate device is assigned to user via contact_devices
    // This matches how get_user_devices works in the AI service
    const { data: assignment, error: assignmentError } = await supabase
      .from('contact_devices')
      .select('device:device_id(device_id, asset_name, organization_id)')
      .eq('contact_id', user_id)
      .eq('device_id', device_id)
      .is('unassigned_at', null)
      .maybeSingle();

    if (assignmentError || !assignment || !assignment.device) {
      console.error('[Device Connection Create] Device not assigned to user:', assignmentError);
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Device not found or not assigned to this user',
        },
        { status: 404 }
      );
    }

    const device = assignment.device as { device_id: number; asset_name: string; organization_id: number };

    // Verify organization matches
    if (device.organization_id !== organization_id) {
      console.error('[Device Connection Create] Organization mismatch');
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Device does not belong to this organization',
        },
        { status: 403 }
      );
    }

    console.log(`[Device Connection Create] Device validated: ${device.asset_name}`);

    // Step 4: Generate unique 6-digit code (returns plain and hashed)
    const codeResult = await generateUniqueCode();

    if (!codeResult) {
      console.error('[Device Connection Create] Failed to generate unique code after retries');
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Failed to generate unique pairing code. Please try again.',
        },
        { status: 500 }
      );
    }

    const { plainCode, hashedCode } = codeResult;
    console.log(`[Device Connection Create] Generated code: ${plainCode} (DEV ONLY - remove in production)`);

    // Step 5: Generate connection session ID and WebSocket URL
    const connectionSessionId = uuidv4();
    const websocketUrl = `wss://${wsBaseUrl}/ws/device/${connectionSessionId}`;

    console.log(`[Device Connection Create] WebSocket URL generated: ${websocketUrl}`);

    // Step 6: Insert device connection record with HASHED code
    // is_active defaults to false in DB
    const { data: connection, error: insertError } = await supabase
      .from('device_connections')
      .insert({
        device_id: device_id,
        user_id: user_id,
        organization_id: organization_id,
        connection_url: websocketUrl,
        session_id: connectionSessionId,
        six_digit_code: hashedCode, // Store HASHED code
        chat_session_id: chat_session_id, // AI chat session reference (REQUIRED)
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('connection_id')
      .single();

    if (insertError || !connection) {
      console.error('[Device Connection Create] Failed to create connection:', insertError);
      return NextResponse.json<CreateDeviceConnectionResponse>(
        {
          success: false,
          error: 'Failed to create device connection record',
        },
        { status: 500 }
      );
    }

    console.log(`[Device Connection Create] Connection created (ID: ${connection.connection_id})`);

    // Step 7: Return success response with PLAIN code (for AI to show user)
    return NextResponse.json<CreateDeviceConnectionResponse>({
      success: true,
      code: plainCode, // Return PLAIN code to AI
    });
  } catch (error: any) {
    console.error('[Device Connection Create] Unexpected error:', error);
    return NextResponse.json<CreateDeviceConnectionResponse>(
      {
        success: false,
        error: `Connection creation failed: ${error.message || 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
