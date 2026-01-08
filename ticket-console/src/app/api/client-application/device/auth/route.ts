/**
 * API Route: Device Authentication
 * POST /api/client-application/device/auth
 *
 * Authenticates a device using U&E code and serial number.
 * Returns JWT token if credentials are valid.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import type { DeviceAuthRequest, DeviceAuthResponse } from '../../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: NextRequest) {
  try {
    const body: DeviceAuthRequest = await request.json();
    const { ue_code, serial_number } = body;

    // Validate required fields
    if (!ue_code || !serial_number) {
      return NextResponse.json<DeviceAuthResponse>(
        {
          success: false,
          error: 'Missing required fields: ue_code, serial_number',
        },
        { status: 400 }
      );
    }

    // Validate ue_code is a valid number
    const ueCodeNum = parseInt(ue_code);
    if (isNaN(ueCodeNum)) {
      return NextResponse.json<DeviceAuthResponse>(
        {
          success: false,
          error: 'Invalid U&E code format',
        },
        { status: 400 }
      );
    }

    console.log(`[Device Auth] Authenticating device with serial: ${serial_number}`);

    // Step 1: Validate organization by U&E code
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('organization_id, name, u_e_code')
      .eq('u_e_code', ueCodeNum)
      .single();

    if (orgError || !org) {
      console.error('[Device Auth] Organization not found:', orgError);
      return NextResponse.json<DeviceAuthResponse>(
        {
          success: false,
          error: 'U&E code doesn\'t match',
        },
        { status: 400 }
      );
    }

    console.log(`[Device Auth] Found organization: ${org.name}`);

    // Step 2: Validate device serial number exists for this organization
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('device_id, asset_name, serial_no')
      .eq('organization_id', org.organization_id)
      .eq('serial_no', serial_number)
      .single();

    if (deviceError || !device) {
      console.error('[Device Auth] Device not found:', deviceError);
      return NextResponse.json<DeviceAuthResponse>(
        {
          success: false,
          error: 'This device is not registered with urackit',
        },
        { status: 400 }
      );
    }

    console.log(`[Device Auth] Found device: ${device.asset_name}`);

    // Step 3: Get the user (contact) who owns this device
    const { data: contactDevice } = await supabase
      .from('contact_devices')
      .select('contact_id, contacts!inner(contact_id, full_name, email)')
      .eq('device_id', device.device_id)
      .is('unassigned_at', null)
      .single();

    const userId = contactDevice?.contact_id || null;
    const userContact = contactDevice?.contacts as any;
    const userEmail = userContact?.email || null;
    const userName = userContact?.full_name || null;

    console.log(`[Device Auth] Device owner: ${userName || 'Unassigned'}`);

    // Step 4: Generate JWT token with 24-hour expiry
    const expiresInSeconds = 24 * 60 * 60; // 24 hours
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + expiresInSeconds;

    const tokenPayload = {
      device_id: device.device_id,
      organization_id: org.organization_id,
      serial_number: device.serial_no,
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      iat: issuedAt,
      exp: expiresAt,
    };

    const jwtToken = jwt.sign(tokenPayload, jwtSecret);

    console.log(`[Device Auth] ✅ Authentication successful`);

    // Return success response
    return NextResponse.json<DeviceAuthResponse>({
      success: true,
      jwt_token: jwtToken,
      device_id: device.device_id,
      user_id: userId,
      organization_id: org.organization_id,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      message: 'Device authenticated successfully',
    });
  } catch (error: any) {
    console.error('[Device Auth] Unexpected error:', error);
    return NextResponse.json<DeviceAuthResponse>(
      {
        success: false,
        error: `Authentication failed: ${error.message || 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
