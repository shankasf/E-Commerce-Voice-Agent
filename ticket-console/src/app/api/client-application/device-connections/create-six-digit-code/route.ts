// Create 6-digit code and store in database (with hashed code)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { CreateSixDigitCodeRequest, CreateSixDigitCodeResponse } from '@/lib/types/device-connections';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const useWSS = process.env.USE_WSS === 'true';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
});

/**
 * Generate random 6-character alphanumeric code
 * PRIMITIVE VERSION - Will be replaced with proper OTP later
 */
function generateSixDigitCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSixDigitCodeRequest = await request.json();
    const { user_id, device_id, organization_id, session_id } = body;

    // Validation
    if (!user_id || !device_id || !organization_id) {
      return NextResponse.json<CreateSixDigitCodeResponse>(
        { success: false, error: 'Missing required fields: user_id, device_id, organization_id' },
        { status: 400 }
      );
    }

    // Check if there's an existing unverified code for this device (within last 5 minutes)
    // Prevent duplicate code creation if one was just created
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    const { data: recentCodes } = await supabase
      .from('device_connections')
      .select('connection_id, session_id, created_at, six_digit_code')
      .eq('device_id', device_id)
      .eq('user_id', user_id)
      .eq('organization_id', organization_id)
      .gt('created_at', fiveMinutesAgo.toISOString())
      .is('verified_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    // If a recent unverified code exists, return it instead of creating a new one
    if (recentCodes && recentCodes.length > 0 && recentCodes[0].six_digit_code) {
      const existingCode = recentCodes[0];
      console.log(`[Create Code] Found existing unverified code for device ${device_id}, returning existing code`);
      
      // Return the existing code (we can't return the original code since it's hashed)
      // Instead, we'll create a new one but log that we found an existing one
      // Actually, we should return an error asking to use the existing code
      // But we can't return the original code... so let's just return the existing session info
      
      // For now, we'll return that a code already exists
      return NextResponse.json<CreateSixDigitCodeResponse>(
        { 
          success: false, 
          error: 'A code was recently generated for this device. Please use the existing code or wait a few minutes.' 
        },
        { status: 400 }
      );
    }

    // Use existing session_id if provided, otherwise generate new one
    const newSessionId = session_id || uuidv4();
    
    // Generate unique 6-digit code
    let code = generateSixDigitCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Hash the code before storing (security best practice)
    const hashedCode = await bcrypt.hash(code, 10);
    
    // Note: We can't easily check uniqueness with hashed codes
    // The hash is deterministic but checking would require comparing all hashes
    // We'll rely on the random generation being sufficiently unique (36^6 = ~2 billion combinations)

    if (attempts >= maxAttempts) {
      return NextResponse.json<CreateSixDigitCodeResponse>(
        { success: false, error: 'Failed to generate unique code' },
        { status: 500 }
      );
    }

    // Calculate expiration (15 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Generate unique WebSocket URL
    const protocol = useWSS ? 'wss' : 'ws';
    const urlObj = new URL(apiBaseUrl);
    const host = urlObj.host; // includes port if specified
    const websocketUrl = `${protocol}://${host}/api/device/ws?session=${newSessionId}&code=${code}`;

    // Check if there's an existing inactive connection for this device
    // The unique constraint allows only one row per (device_id, is_active) combination
    // So we need to delete or update existing inactive connections before creating a new one
    const { data: existingInactive } = await supabase
      .from('device_connections')
      .select('connection_id')
      .eq('device_id', device_id)
      .eq('is_active', false);

    if (existingInactive && existingInactive.length > 0) {
      // Delete old inactive connections (they're just pending codes older than 5 minutes)
      // This prevents unique constraint violation
      await supabase
        .from('device_connections')
        .delete()
        .eq('device_id', device_id)
        .eq('is_active', false);
      console.log(`[Create Code] Deleted ${existingInactive.length} existing inactive connection(s) for device ${device_id}`);
    }

    // Also deactivate any existing active connections (only one active per device)
    const { data: existingActive } = await supabase
      .from('device_connections')
      .select('connection_id')
      .eq('device_id', device_id)
      .eq('is_active', true);

    if (existingActive && existingActive.length > 0) {
      // Deactivate existing active connections
      await supabase
        .from('device_connections')
        .update({ 
          is_active: false,
          disconnected_at: new Date().toISOString(),
        })
        .eq('device_id', device_id)
        .eq('is_active', true);
      console.log(`[Create Code] Deactivated ${existingActive.length} existing active connection(s) for device ${device_id}`);
    }

    // Insert into database with HASHED code (not plain text)
    const { data: connection, error } = await supabase
      .from('device_connections')
      .insert({
        session_id: newSessionId,
        user_id,
        device_id,
        organization_id,
        six_digit_code: hashedCode, // Store hashed version, not plain code
        connection_url: websocketUrl, // Using connection_url to match coworker's schema
        is_active: false, // Will be set to true when connection is established
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating device connection:', error);
      return NextResponse.json<CreateSixDigitCodeResponse>(
        { success: false, error: error.message || 'Failed to create connection' },
        { status: 500 }
      );
    }

    console.log(`[Create Code] Code: ${code}, Session: ${newSessionId}, User: ${user_id}, Device: ${device_id}, Org: ${organization_id}`);
    console.log(`[Create Code] WebSocket URL: ${websocketUrl}`);

    return NextResponse.json<CreateSixDigitCodeResponse>({
      success: true,
      code,
      session_id: newSessionId,
      websocket_url: websocketUrl, // Return websocket_url in response (internal name)
      expires_in_seconds: 900 // 15 minutes
    });
  } catch (error: any) {
    console.error('Error creating 6-digit code:', error);
    return NextResponse.json<CreateSixDigitCodeResponse>(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
