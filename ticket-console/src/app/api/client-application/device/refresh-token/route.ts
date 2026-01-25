/**
 * API Route: Token Refresh
 * POST /api/client-application/device/refresh-token
 *
 * Refreshes an expired JWT token by re-authenticating with credentials.
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import type { TokenRefreshRequest, TokenRefreshResponse } from '../../types';

const jwtSecret = process.env.JWT_SECRET;

// Validate environment variables
if (!jwtSecret) {
  console.error('Missing required JWT_SECRET environment variable');
}

export async function POST(request: NextRequest) {
  try {
    const body: TokenRefreshRequest = await request.json();
    const { ue_code, serial_number } = body;

    // Validate required fields
    if (!ue_code || !serial_number) {
      return NextResponse.json<TokenRefreshResponse>(
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
      return NextResponse.json<TokenRefreshResponse>(
        {
          success: false,
          error: 'Invalid U&E code format',
        },
        { status: 400 }
      );
    }

    console.log(`[Token Refresh] Refreshing token for serial: ${serial_number}`);

    // Step 1: Validate organization by U&E code
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('organization_id, name, u_e_code')
      .eq('u_e_code', ueCodeNum)
      .single();

    if (orgError || !org) {
      console.error('[Token Refresh] Organization not found:', orgError);
      return NextResponse.json<TokenRefreshResponse>(
        {
          success: false,
          error: 'U&E code doesn\'t match',
        },
        { status: 400 }
      );
    }

    // Step 2: Validate device serial number exists for this organization
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('device_id, asset_name, serial_no')
      .eq('organization_id', org.organization_id)
      .eq('serial_no', serial_number)
      .single();

    if (deviceError || !device) {
      console.error('[Token Refresh] Device not found:', deviceError);
      return NextResponse.json<TokenRefreshResponse>(
        {
          success: false,
          error: 'This device is not registered with urackit',
        },
        { status: 400 }
      );
    }

    console.log(`[Token Refresh] Refreshing token for device: ${device.asset_name}`);

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

    console.log(`[Token Refresh] Device owner: ${userName || 'Unassigned'}`);

    // Step 4: Generate new JWT token with 24-hour expiry
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

    const jwtToken = jwt.sign(tokenPayload, jwtSecret!);

    console.log(`[Token Refresh] ✅ Token refreshed successfully`);

    // Return success response
    return NextResponse.json<TokenRefreshResponse>({
      success: true,
      jwt_token: jwtToken,
      expires_at: new Date(expiresAt * 1000).toISOString(),
      message: 'Token refreshed successfully',
    });
  } catch (error: any) {
    console.error('[Token Refresh] Unexpected error:', error);
    return NextResponse.json<TokenRefreshResponse>(
      {
        success: false,
        error: `Token refresh failed: ${error.message || 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
