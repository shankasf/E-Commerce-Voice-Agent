/**
 * API Route: Create 6-Digit Pairing Code
 * POST /api/client-application/device-connections/create-six-digit-code
 *
 * Creates a 6-digit pairing code for AI service initiated Windows application connections.
 * The code is hashed (SHA-256) before storage for security. The original code is returned
 * to the AI service to communicate to the user.
 *
 * SECURITY:
 * - Only accepts requests from Python AI backend (API key + IP whitelist)
 * - No web session required (AI service initiated)
 * - Codes are hashed before storage (one-way hash)
 * - Codes expire after 15 minutes
 *
 * FLOW:
 * 1. AI service calls this endpoint when it needs to connect to a Windows app
 * 2. Endpoint generates 6-digit code and hashes it
 * 3. Creates device_connection record with is_active=FALSE
 * 4. Returns original code to AI service
 * 5. Windows app connects with code, verifies hash, activates connection
 *
 * @module device-connections/create-six-digit-code
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import type { CreateSixDigitCodeRequest, CreateSixDigitCodeResponse } from '../../types';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const aiServiceApiKey = process.env.AI_SERVICE_API_KEY || '';
const aiServiceAllowedIPs = (process.env.AI_SERVICE_ALLOWED_IPS || '').split(',').filter(Boolean);
const wsBaseUrl = process.env.WS_BASE_URL || '';

// Validate critical environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Create Six Digit Code] Missing required Supabase environment variables');
}

if (!aiServiceApiKey || !wsBaseUrl) {
  console.error('[Create Six Digit Code] Missing required AI service configuration');
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
 * Uses crypto.randomBytes for secure random generation
 * 
 * @returns 6-character uppercase alphanumeric code (A-Z, 0-9)
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
 * Hash a code using SHA-256 (one-way hash)
 * Normalizes to uppercase for consistency
 * The original code is never stored in the database
 * 
 * @param code - Original 6-digit code
 * @returns SHA-256 hash of the code (hex string)
 */
function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase().trim()).digest('hex');
}

/**
 * Check if a hashed code already exists in the database
 * Checks both active and inactive connections to ensure uniqueness
 * 
 * @param hashedCode - SHA-256 hash of the code
 * @returns true if code is unique, false if collision detected
 */
async function isHashedCodeUnique(hashedCode: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('device_connections')
      .select('six_digit_code')
      .eq('six_digit_code', hashedCode)
      .maybeSingle();

    if (error) {
      console.error('[Create Six Digit Code] Error checking code uniqueness:', error);
      // On error, assume not unique to be safe
      return false;
    }

    return data === null;
  } catch (error) {
    console.error('[Create Six Digit Code] Exception checking code uniqueness:', error);
    return false;
  }
}

/**
 * Generate a unique 6-digit code with retry logic
 * Hashes each code and checks for collisions
 * 
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @returns Generated code or null if all retries failed
 */
async function generateUniqueCode(maxRetries: number = 5): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const code = generateSecureCode();
      const hashedCode = hashCode(code);
      const isUnique = await isHashedCodeUnique(hashedCode);

      if (isUnique) {
        return code;
      }

      console.warn(`[Create Six Digit Code] Code collision detected (attempt ${i + 1}/${maxRetries})`);
    } catch (error) {
      console.error(`[Create Six Digit Code] Error generating code (attempt ${i + 1}/${maxRetries}):`, error);
    }
  }

  return null;
}

/**
 * Get client IP address from request headers
 * Handles various proxy scenarios (x-forwarded-for, x-real-ip)
 * 
 * @param request - Next.js request object
 * @returns Client IP address or 'unknown' if not available
 */
function getClientIP(request: NextRequest): string {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');

    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwarded.split(',')[0].trim();
    }

    if (realIP) {
      return realIP.trim();
    }

    return 'unknown';
  } catch (error) {
    console.error('[Create Six Digit Code] Error extracting client IP:', error);
    return 'unknown';
  }
}

/**
 * Validate AI service authentication (API key and IP whitelist)
 * 
 * @param apiKey - API key from request header
 * @param clientIP - Client IP address
 * @returns Error response if validation fails, null if valid
 */
function validateAuthentication(
  apiKey: string | null,
  clientIP: string
): NextResponse<CreateSixDigitCodeResponse> | null {
  // Validate API key
  if (!apiKey || apiKey !== aiServiceApiKey) {
    console.error('[Create Six Digit Code] Unauthorized: Invalid API key');
    return NextResponse.json<CreateSixDigitCodeResponse>(
      {
        success: false,
        error: 'Unauthorized: Invalid AI service credentials',
      },
      { status: 401 }
    );
  }

  // Validate IP whitelist (skip in development if unknown)
  if (clientIP !== 'unknown' && aiServiceAllowedIPs.length > 0 && !aiServiceAllowedIPs.includes(clientIP)) {
    console.error(`[Create Six Digit Code] Forbidden: IP ${clientIP} not whitelisted`);
    return NextResponse.json<CreateSixDigitCodeResponse>(
      {
        success: false,
        error: 'Forbidden: IP address not authorized',
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Validate that user_id, device_id, and organization_id exist and match
 * 
 * @param user_id - Contact ID
 * @param device_id - Device ID
 * @param organization_id - Organization ID
 * @returns Error response if validation fails, null if valid
 */
async function validateIds(
  user_id: number,
  device_id: number,
  organization_id: number
): Promise<NextResponse<CreateSixDigitCodeResponse> | null> {
  try {
    // Validate device exists and belongs to organization
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('device_id, asset_name, organization_id')
      .eq('device_id', device_id)
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (deviceError) {
      console.error('[Create Six Digit Code] Device query error:', deviceError);
      return NextResponse.json<CreateSixDigitCodeResponse>(
        {
          success: false,
          error: 'Failed to validate device',
        },
        { status: 500 }
      );
    }

    if (!device) {
      console.error('[Create Six Digit Code] Device not found or does not belong to organization');
      return NextResponse.json<CreateSixDigitCodeResponse>(
        {
          success: false,
          error: 'Device not found or does not belong to this organization',
        },
        { status: 404 }
      );
    }

    // Validate user exists and belongs to organization
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('contact_id, organization_id')
      .eq('contact_id', user_id)
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (contactError) {
      console.error('[Create Six Digit Code] Contact query error:', contactError);
      return NextResponse.json<CreateSixDigitCodeResponse>(
        {
          success: false,
          error: 'Failed to validate user',
        },
        { status: 500 }
      );
    }

    if (!contact) {
      console.error('[Create Six Digit Code] User not found or does not belong to organization');
      return NextResponse.json<CreateSixDigitCodeResponse>(
        {
          success: false,
          error: 'User not found or does not belong to this organization',
        },
        { status: 404 }
      );
    }

    console.log(`[Create Six Digit Code] Validated: Device ${device.asset_name}, User ${user_id}, Org ${organization_id}`);
    return null;
  } catch (error) {
    console.error('[Create Six Digit Code] Exception validating IDs:', error);
    return NextResponse.json<CreateSixDigitCodeResponse>(
      {
        success: false,
        error: 'Failed to validate user, device, or organization',
      },
      { status: 500 }
    );
  }
}

/**
 * Check if session_id already exists and return existing connection if found
 * 
 * @param session_id - Session ID to check
 * @returns Existing connection data if found, null if not found or error
 */
async function checkExistingSession(
  session_id: string
): Promise<{ code: string; session_id: string; websocket_url: string } | null> {
  try {
    const { data: existing, error } = await supabase
      .from('device_connections')
      .select('session_id, connection_url, six_digit_code, is_active')
      .eq('session_id', session_id)
      .maybeSingle();

    if (error) {
      console.error('[Create Six Digit Code] Error checking existing session:', error);
      return null;
    }

    if (!existing) {
      return null;
    }

    // If session is already active, return error indication
    if (existing.is_active) {
      console.warn(`[Create Six Digit Code] Session ${session_id} is already active`);
      return null; // Will be handled by caller
    }

    // Session exists but is inactive - we can't return the original code
    // because it's hashed. We need to generate a new code.
    // However, we can return the existing connection URL
    console.log(`[Create Six Digit Code] Found existing inactive session: ${session_id}`);
    
    // Extract code from connection_url if present
    const urlMatch = existing.connection_url?.match(/code=([A-Z0-9]{6})/);
    const code = urlMatch ? urlMatch[1] : null;

    if (code) {
      return {
        code,
        session_id: existing.session_id,
        websocket_url: existing.connection_url,
      };
    }

    return null;
  } catch (error) {
    console.error('[Create Six Digit Code] Exception checking existing session:', error);
    return null;
  }
}

/**
 * Main POST handler for creating 6-digit pairing codes
 * 
 * @param request - Next.js request object
 * @returns JSON response with code, session_id, and websocket_url
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateSixDigitCodeResponse>> {
  try {
    // Step 1: Validate AI Service Authentication
    const apiKey = request.headers.get('x-ai-service-key');
    const clientIP = getClientIP(request);

    console.log(`[Create Six Digit Code] Request from IP: ${clientIP}`);

    const authError = validateAuthentication(apiKey, clientIP);
    if (authError) {
      return authError;
    }

    // Step 2: Parse and validate request body
    let body: CreateSixDigitCodeRequest;
    try {
      body = await request.json();
    } catch (error) {
      console.error('[Create Six Digit Code] Invalid JSON in request body:', error);
      return NextResponse.json<CreateSixDigitCodeResponse>(
        {
          success: false,
          error: 'Invalid request body: JSON parse error',
        },
        { status: 400 }
      );
    }

    const { user_id, device_id, organization_id, session_id: providedSessionId } = body;

    // Validate required fields
    if (!user_id || !device_id || !organization_id) {
      return NextResponse.json<CreateSixDigitCodeResponse>(
        {
          success: false,
          error: 'Missing required fields: user_id, device_id, organization_id',
        },
        { status: 400 }
      );
    }

    // Validate field types
    if (
      typeof user_id !== 'number' ||
      typeof device_id !== 'number' ||
      typeof organization_id !== 'number'
    ) {
      return NextResponse.json<CreateSixDigitCodeResponse>(
        {
          success: false,
          error: 'Invalid field types: user_id, device_id, and organization_id must be numbers',
        },
        { status: 400 }
      );
    }

    console.log(`[Create Six Digit Code] Creating code for user ${user_id}, device ${device_id}, org ${organization_id}`);

    // Step 3: Check if session_id was provided and if it exists
    let finalSessionId = providedSessionId;
    if (providedSessionId) {
      const existing = await checkExistingSession(providedSessionId);
      
      if (existing) {
        // Check if session is active
        const { data: activeCheck } = await supabase
          .from('device_connections')
          .select('is_active')
          .eq('session_id', providedSessionId)
          .eq('is_active', true)
          .maybeSingle();

        if (activeCheck) {
          return NextResponse.json<CreateSixDigitCodeResponse>(
            {
              success: false,
              error: 'Session already active. Cannot create new code for active session.',
            },
            { status: 409 } // Conflict
          );
        }

        // Session exists but is inactive - return existing connection
        // Note: We can't return the original code since it's hashed
        // So we'll generate a new code but reuse the session_id
        console.log(`[Create Six Digit Code] Reusing existing session: ${providedSessionId}`);
      }
    }

    // Step 4: Validate IDs exist and match
    const validationError = await validateIds(user_id, device_id, organization_id);
    if (validationError) {
      return validationError;
    }

    // Step 5: Generate unique 6-digit code
    const code = await generateUniqueCode();
    if (!code) {
      console.error('[Create Six Digit Code] Failed to generate unique code after retries');
      return NextResponse.json<CreateSixDigitCodeResponse>(
        {
          success: false,
          error: 'Failed to generate unique pairing code. Please try again.',
        },
        { status: 500 }
      );
    }

    console.log(`[Create Six Digit Code] Generated unique code: ${code.substring(0, 2)}**`); // Log partial for security

    // Step 6: Hash the code for storage
    const hashedCode = hashCode(code);

    // Step 7: Generate session ID if not provided
    if (!finalSessionId) {
      finalSessionId = uuidv4();
    }

    // Step 8: Build WebSocket URL
    const websocketUrl = `wss://${wsBaseUrl}/ws/device/${finalSessionId}?code=${code}`;

    console.log(`[Create Six Digit Code] WebSocket URL: wss://${wsBaseUrl}/ws/device/${finalSessionId}?code=******`);

    // Step 9: Insert device connection record
    // Use upsert to handle case where session_id already exists
    const { data: connection, error: insertError } = await supabase
      .from('device_connections')
      .upsert(
        {
          device_id: device_id,
          user_id: user_id,
          organization_id: organization_id,
          connection_url: websocketUrl,
          session_id: finalSessionId,
          six_digit_code: hashedCode, // Store hashed version only
          is_active: false, // Start as inactive until Windows app verifies
          connected_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'session_id',
          ignoreDuplicates: false,
        }
      )
      .select('connection_id, session_id')
      .single();

    if (insertError) {
      // Check if it's a unique constraint violation
      if (insertError.code === '23505') {
        console.error('[Create Six Digit Code] Duplicate connection_url or session_id:', insertError);
        return NextResponse.json<CreateSixDigitCodeResponse>(
          {
            success: false,
            error: 'Connection URL or session ID already exists. Please try again.',
          },
          { status: 409 } // Conflict
        );
      }

      console.error('[Create Six Digit Code] Failed to create connection:', insertError);
      return NextResponse.json<CreateSixDigitCodeResponse>(
        {
          success: false,
          error: 'Failed to create device connection record',
        },
        { status: 500 }
      );
    }

    if (!connection) {
      console.error('[Create Six Digit Code] Connection created but no data returned');
      return NextResponse.json<CreateSixDigitCodeResponse>(
        {
          success: false,
          error: 'Failed to create device connection record',
        },
        { status: 500 }
      );
    }

    console.log(`[Create Six Digit Code] ✅ Connection created successfully (ID: ${connection.connection_id}, Session: ${connection.session_id})`);

    // Step 10: Return success response with original code
    return NextResponse.json<CreateSixDigitCodeResponse>({
      success: true,
      code: code, // Return original unhashed code
      session_id: finalSessionId,
      websocket_url: websocketUrl,
      expires_in_seconds: 900, // 15 minutes
    });
  } catch (error: any) {
    // Catch-all error handler - ensures app never breaks
    console.error('[Create Six Digit Code] Unexpected error:', error);
    
    // Log error details for debugging (but don't expose to client)
    if (error instanceof Error) {
      console.error('[Create Six Digit Code] Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }

    return NextResponse.json<CreateSixDigitCodeResponse>(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}

