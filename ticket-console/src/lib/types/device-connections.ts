/**
 * TypeScript type definitions for Device Connections
 * Based on coworker's types with integration into our codebase
 */

/**
 * Request to create a 6-digit pairing code.
 * Called by AI service/MCP tool when it needs to connect to a Windows application.
 */
export interface CreateSixDigitCodeRequest {
  user_id: number;        // contact_id from contacts table
  device_id: number;      // device_id from devices table
  organization_id: number; // organization_id from organizations table
  session_id?: string;    // Optional: if provided, reuses existing session
}

/**
 * Response from creating a 6-digit pairing code.
 */
export interface CreateSixDigitCodeResponse {
  success: boolean;
  code?: string;              // 6-digit alphanumeric code (e.g., "C8PKRV")
  session_id?: string;        // UUID session identifier
  websocket_url?: string;     // Full WebSocket URL for connection
  expires_in_seconds?: number; // 900 (15 minutes)
  error?: string;
}

/**
 * Request to verify a 6-digit code and get WebSocket URL.
 * Called by Windows application when user enters the code.
 * user_id, device_id, organization_id are optional - if not provided, searches all codes.
 */
export interface VerifyCodeRequest {
  user_id?: number;        // Optional: contact_id from contacts table
  device_id?: number;      // Optional: device_id from devices table
  organization_id?: number; // Optional: organization_id from organizations table
  six_digit_code: string;  // Required: Original 6-digit code entered by user (e.g., "C8PKRV")
}

/**
 * Response from verifying a 6-digit code.
 * Returns the WebSocket URL if code is valid and matches all parameters.
 * Code is deleted after successful verification.
 */
export interface VerifyCodeResponse {
  success: boolean;
  websocket_url?: string;     // Full WebSocket URL for connection
  session_id?: string;         // UUID session identifier
  user_id?: number;            // Returned from database for convenience
  device_id?: number;          // Returned from database for convenience
  organization_id?: number;    // Returned from database for convenience
  expires_in_seconds?: number; // Time remaining until expiration
  error?: string;
}
