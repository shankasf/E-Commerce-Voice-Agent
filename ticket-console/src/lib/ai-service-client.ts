/**
 * Shared utility for calling AI Service backend
 * Provides consistent authentication, error handling, and request formatting
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8081';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;

export interface ChatContext {
  userId: number | null;
  userRole: string;
  userEmail: string | null;
  userName: string | null;
  organizationId: number | null;
  contactId?: number | null;
  deviceId?: number | null;
  agentId?: number | null;
  specialization?: string | null;
  maxPermissions: string;
}

export interface JWTPayload {
  userId?: number;
  user_id?: number;
  role?: string;
  userRole?: string;
  email?: string;
  user_email?: string;
  name?: string;
  user_name?: string;
  organizationId?: number;
  organization_id?: number;
  contactId?: number;
  contact_id?: number;
  deviceId?: number;
  device_id?: number;
  agentId?: number;
  support_agent_id?: number;
  specialization?: string;
}

/**
 * Build context object from JWT payload based on user role
 */
export function buildContextForRole(userPayload: JWTPayload): ChatContext {
  // Extract user info with fallbacks for different JWT formats
  const userId = userPayload.userId || userPayload.user_id || null;
  const userRole = userPayload.role || userPayload.userRole || 'requester';
  const userEmail = userPayload.email || userPayload.user_email || null;
  const userName = userPayload.name || userPayload.user_name || null;
  const organizationId = userPayload.organizationId || userPayload.organization_id || null;

  const baseContext: ChatContext = {
    userId,
    userRole,
    userEmail,
    userName,
    organizationId,
    maxPermissions: 'read_own_tickets',
  };

  // Role-specific context enrichment
  switch (userRole.toLowerCase()) {
    case 'requester':
      return {
        ...baseContext,
        contactId: userPayload.contactId || userPayload.contact_id || null,
        deviceId: userPayload.deviceId || userPayload.device_id || null,
        maxPermissions: 'read_own_tickets',
      };

    case 'agent':
      return {
        ...baseContext,
        agentId: userPayload.agentId || userPayload.support_agent_id || null,
        specialization: userPayload.specialization || null,
        maxPermissions: 'manage_assigned_tickets',
      };

    case 'admin':
      return {
        ...baseContext,
        maxPermissions: 'full_access',
      };

    default:
      console.warn(`[AI Service Client] Unknown role: ${userRole}, defaulting to requester`);
      return {
        ...baseContext,
        maxPermissions: 'read_own_tickets',
      };
  }
}

/**
 * Make a request to the AI service backend
 */
export async function callAIService(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> {
  const { method = 'POST', body, headers = {} } = options;

  const url = `${AI_SERVICE_URL}${endpoint}`;
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add API key if configured
  if (AI_SERVICE_API_KEY) {
    requestHeaders['X-AI-Service-Key'] = AI_SERVICE_API_KEY;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    return response;
  } catch (error) {
    console.error(`[AI Service Client] Error calling ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Parse and handle AI service response
 */
export async function handleAIServiceResponse<T = any>(
  response: Response,
  endpoint: string
): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AI Service Client] Error from ${endpoint}:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`AI service error: ${response.statusText} - ${errorText}`);
  }

  try {
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`[AI Service Client] Failed to parse JSON from ${endpoint}:`, error);
    throw new Error('Invalid response from AI service');
  }
}




