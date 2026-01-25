/**
 * API Route: Create Device Connection
 * POST /api/client-application/device-connections/create
 *
 * Creates a secure device connection with 6-digit pairing code.
 * Called by AI Service (MCP Tool) when user requests a connection code.
 *
 * SECURITY:
 * - Only accepts requests from Python AI backend (API key + IP whitelist)
 * - Generates cryptographically secure pairing codes
 * - Stores HASHED version of 6-digit code (SHA-256)
 * - Returns plain code to AI for display to user
 * - Code expires in 15 minutes and is one-time use
 *
 * FLOW:
 * 1. AI Service calls this endpoint with user/device context
 * 2. Generates unique 6-digit code, hashes it, stores in DB
 * 3. Returns plain code to AI → AI shows to user
 * 4. User enters code in Windows app → Windows connects to WebSocket with code
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import type { CreateDeviceConnectionRequest, CreateDeviceConnectionResponse } from '../../types';

const aiServiceApiKey = process.env.AI_SERVICE_API_KEY || '';
const aiServiceAllowedIPs = (process.env.AI_SERVICE_ALLOWED_IPS || '127.0.0.1,localhost').split(',');

// Validate environment variables
if (!aiServiceApiKey) {
  console.error('Missing required AI service configuration');
}

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
 * Check if hashed code is unique among VALID pending connections
 * A code is considered "in use" only if:
 * - Not expired (created within last 15 minutes)
 * - Not already used (used = false)
 * - Not currently active (is_active = false, meaning waiting to be used)
 */
async function isHashedCodeUnique(hashedCode: string): Promise<boolean> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('device_connections')
    .select('six_digit_code')
    .eq('six_digit_code', hashedCode)
    .eq('used', false)  // Only check unused codes
    .gte('created_at', fifteenMinutesAgo)  // Only check non-expired codes
    .maybeSingle();

  if (error) {
    console.error('Error checking code uniqueness:', error);
    return false;
  }

  return data === null;
}

/**
 * Delete any existing unused/pending codes for this user/device combination
 * This allows generating a new code even if a previous one wasn't used
 * We DELETE instead of UPDATE to avoid unique constraint violations
 */
async function deleteExistingPendingCodes(userId: number, deviceId: number): Promise<void> {
  try {
    const { error, count } = await supabase
      .from('device_connections')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .eq('used', false)  // Only delete unused codes
      .eq('is_active', false);  // Only delete pending codes (not active connections)

    if (error) {
      console.error('Error deleting existing codes:', error);
    } else {
      console.log(`[Device Connection Create] Deleted existing pending codes for user ${userId}, device ${deviceId}`);
    }
  } catch (e) {
    console.error('Exception deleting existing codes:', e);
  }
}

/**
 * Generate unique 6-digit code with retries
 * Returns both plain code and hashed code
 */
async function generateUniqueCode(maxRetries: number = 10): Promise<{ plainCode: string; hashedCode: string } | null> {
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

    // Handle both single object and array cases from Supabase join
    const deviceData = Array.isArray(assignment.device) ? assignment.device[0] : assignment.device;
    const device = deviceData as { device_id: number; asset_name: string; organization_id: number };

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

    // Step 4: Delete any existing unused codes for this user/device
    // This allows generating a new code even if a previous one wasn't used
    await deleteExistingPendingCodes(user_id, device_id);

    // Step 5: Generate unique 6-digit code (returns plain and hashed)
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

    // Step 6: Insert device connection record with HASHED code
    // No WebSocket URL or session_id - Windows app connects directly with code
    // is_active defaults to false in DB, used=false for one-time use
    const { data: connection, error: insertError } = await supabase
      .from('device_connections')
      .insert({
        device_id: device_id,
        user_id: user_id,
        organization_id: organization_id,
        six_digit_code: hashedCode, // Store HASHED code
        chat_session_id: chat_session_id, // AI chat session reference (REQUIRED)
        is_active: false,
        used: false, // One-time use flag
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
