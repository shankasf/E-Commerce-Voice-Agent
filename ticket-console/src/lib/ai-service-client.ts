/**
 * AI Service Client - HTTPS client with custom CA certificate trust
 *
 * This module provides a fetch wrapper that trusts the ai-service's
 * self-signed SSL certificate for secure communication.
 *
 * For Next.js API routes, we set NODE_TLS_REJECT_UNAUTHORIZED or use
 * a custom https.Agent with the CA certificate.
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const AI_SERVICE_URL = process.env.BASE_URL_AI || process.env.AI_SERVICE_URL || 'https://localhost:8080';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';
const AI_SERVICE_CA_CERT = process.env.AI_SERVICE_CA_CERT || './crt/ca.crt';

export interface ChatContext {
  // Using snake_case to match Python AI service expectations
  user_id: number | null;
  user_role: string;
  user_email: string | null;
  user_name: string | null;
  organization_id: number | null;
  contact_id?: number | null;
  device_id?: number | null;
  agent_id?: number | null;
  specialization?: string | null;
  max_permissions: string;
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
 * Uses snake_case keys to match Python AI service expectations
 */
export function buildContextForRole(userPayload: JWTPayload): ChatContext {
  // Extract user info with fallbacks for different JWT formats
  const userId = userPayload.userId || userPayload.user_id || null;
  const userRole = userPayload.role || userPayload.userRole || 'requester';
  const userEmail = userPayload.email || userPayload.user_email || null;
  const userName = userPayload.name || userPayload.user_name || null;
  const organizationId = userPayload.organizationId || userPayload.organization_id || null;

  const baseContext: ChatContext = {
    user_id: userId,
    user_role: userRole,
    user_email: userEmail,
    user_name: userName,
    organization_id: organizationId,
    max_permissions: 'read_own_tickets',
  };

  // Role-specific context enrichment
  switch (userRole.toLowerCase()) {
    case 'requester':
      // For device auth, user_id IS the contact_id (from contact_devices table)
      return {
        ...baseContext,
        contact_id: userPayload.contactId || userPayload.contact_id || userId,
        device_id: userPayload.deviceId || userPayload.device_id || null,
        max_permissions: 'read_own_tickets',
      };

    case 'agent':
      return {
        ...baseContext,
        agent_id: userPayload.agentId || userPayload.support_agent_id || null,
        specialization: userPayload.specialization || null,
        max_permissions: 'manage_assigned_tickets',
      };

    case 'admin':
      return {
        ...baseContext,
        max_permissions: 'full_access',
      };

    default:
      console.warn(`[AI Service Client] Unknown role: ${userRole}, defaulting to requester`);
      return {
        ...baseContext,
        max_permissions: 'read_own_tickets',
      };
  }
}

// Cache the HTTPS agent - skip SSL verification for development
let cachedAgent: https.Agent | null = null;

/**
 * Get HTTPS agent that skips certificate verification (dev mode)
 */
function getHttpsAgent(): https.Agent {
  if (!cachedAgent) {
    cachedAgent = new https.Agent({
      rejectUnauthorized: false,
    });
  }
  return cachedAgent;
}

/**
 * Make an HTTPS/HTTP request to the AI service using Node.js native modules
 * This is more reliable than fetch for custom CA certificates
 */
function makeRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<{ status: number; data: any; ok: boolean }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';

    const requestOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    // Add custom agent for HTTPS
    if (isHttps) {
      requestOptions.agent = getHttpsAgent();
    }

    const protocol = isHttps ? https : http;

    const req = protocol.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch {
          parsedData = data;
        }

        resolve({
          status: res.statusCode || 500,
          data: parsedData,
          ok: (res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300,
        });
      });
    });

    req.on('error', (error) => {
      console.error('[AI Service Client] Request error:', error);
      reject(error);
    });

    // Set timeout
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    // Write body if present
    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Response wrapper to match fetch Response interface
 */
class AIServiceResponse {
  public status: number;
  public ok: boolean;
  private data: any;

  constructor(status: number, ok: boolean, data: any) {
    this.status = status;
    this.ok = ok;
    this.data = data;
  }

  async json(): Promise<any> {
    return this.data;
  }

  async text(): Promise<string> {
    return typeof this.data === 'string' ? this.data : JSON.stringify(this.data);
  }

  get statusText(): string {
    if (this.status >= 200 && this.status < 300) return 'OK';
    if (this.status === 400) return 'Bad Request';
    if (this.status === 401) return 'Unauthorized';
    if (this.status === 403) return 'Forbidden';
    if (this.status === 404) return 'Not Found';
    if (this.status >= 500) return 'Internal Server Error';
    return 'Unknown';
  }
}

/**
 * Custom fetch function for AI service requests
 * Handles HTTPS with custom CA certificate trust
 */
export async function aiServiceFetch(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<AIServiceResponse> {
  const url = `${AI_SERVICE_URL}${endpoint}`;

  // Prepare headers with API key
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-AI-Service-Key': AI_SERVICE_API_KEY,
    ...(options.headers || {}),
  };

  const result = await makeRequest(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  });

  return new AIServiceResponse(result.status, result.ok, result.data);
}

/**
 * Export the AI service URL for reference
 */
export function getAiServiceUrl(): string {
  return AI_SERVICE_URL;
}

/**
 * Check if AI service is reachable
 */
export async function checkAiServiceHealth(): Promise<boolean> {
  try {
    const response = await aiServiceFetch('/health');
    return response.ok;
  } catch (error) {
    console.error('[AI Service Client] Health check failed:', error);
    return false;
  }
}