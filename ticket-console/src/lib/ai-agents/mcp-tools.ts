/**
 * MCP Tools for AI Agents
 * Functions that AI agents can call to interact with the system
 */

import { CreateSixDigitCodeRequest, CreateSixDigitCodeResponse } from '@/lib/types/device-connections';

// For server-side API calls within Next.js, use relative URLs or same-origin
// If running in development, default to localhost:3001 (Next.js default)
const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  // For server-side Next.js API routes, we can use relative URLs
  // But since we're making fetch calls from server-side, we need absolute URL
  const port = process.env.PORT || '3001';
  return `http://localhost:${port}`;
};

const API_BASE_URL = getApiBaseUrl();

/**
 * MCP Tool: Create 6-digit code for terminal access
 * Called by AI agent when it needs terminal access to user's device
 */
export async function createSixDigitCodeForTerminal(
  ticketId: number,
  userId: number,
  deviceId: number,
  organizationId: number
): Promise<CreateSixDigitCodeResponse> {
  try {
    console.log('[MCP Tool] Creating 6-digit code for terminal access:', {
      ticketId,
      userId,
      deviceId,
      organizationId,
    });

    const response = await fetch(`${API_BASE_URL}/api/client-application/device-connections/create-six-digit-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        device_id: deviceId,
        organization_id: organizationId,
      } as CreateSixDigitCodeRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: CreateSixDigitCodeResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to create 6-digit code');
    }

    console.log('[MCP Tool] 6-digit code created successfully:', {
      code: data.code,
      session_id: data.session_id,
      expires_in_seconds: data.expires_in_seconds,
    });

    return data;
  } catch (error: any) {
    console.error('[MCP Tool] Error creating 6-digit code:', error);
    return {
      success: false,
      error: error.message || 'Failed to create 6-digit code',
    };
  }
}
