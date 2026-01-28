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

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'https://localhost:8081';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY || '';
const AI_SERVICE_CA_CERT = process.env.AI_SERVICE_CA_CERT;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Cache the HTTPS agent
let cachedAgent: https.Agent | null = null;

/**
 * Get HTTPS agent with proper SSL handling
 * - In production: requires valid CA certificate
 * - In development: falls back to skipping verification if no CA cert provided
 */
function getHttpsAgent(): https.Agent {
  if (!cachedAgent) {
    // Try to load CA certificate
    let caCert: Buffer | undefined;

    if (AI_SERVICE_CA_CERT) {
      try {
        const certPath = path.resolve(process.cwd(), AI_SERVICE_CA_CERT);
        if (fs.existsSync(certPath)) {
          caCert = fs.readFileSync(certPath);
          console.log('[AI Service Client] Using CA certificate from:', certPath);
        }
      } catch (error) {
        console.warn('[AI Service Client] Failed to load CA certificate:', error);
      }
    }

    if (caCert) {
      // Use CA certificate for secure connection
      cachedAgent = new https.Agent({
        ca: caCert,
        rejectUnauthorized: true,
      });
    } else if (NODE_ENV === 'development') {
      // Development fallback - skip verification with warning
      console.warn('[AI Service Client] WARNING: Skipping SSL verification in development mode. Set AI_SERVICE_CA_CERT for secure connections.');
      cachedAgent = new https.Agent({
        rejectUnauthorized: false,
      });
    } else {
      // Production without CA cert - use system defaults
      console.warn('[AI Service Client] No CA certificate configured, using system defaults');
      cachedAgent = new https.Agent({
        rejectUnauthorized: true,
      });
    }
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
