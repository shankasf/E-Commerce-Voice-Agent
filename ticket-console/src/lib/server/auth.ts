/**
 * Server-only authentication utilities
 * These functions use Node.js libraries and must NOT be imported in client components
 */
import jwt from 'jsonwebtoken';

/**
 * JWT_SECRET - Server-side only
 * This environment variable should be set in your deployment environment.
 * DO NOT use hardcoded fallback values in production.
 */
const JWT_SECRET = process.env.JWT_SECRET;

export interface UserPayload {
  userId: number;
  role: string;
  email: string;
  name: string;
  organizationId?: number;
  contactId?: number;
  agentId?: number;
  specialization?: string;
}

/**
 * Generate a JWT token for a user session
 * Used for authenticating API requests to the chat service
 */
export function generateUserToken(payload: UserPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 24 * 60 * 60; // 24 hours

  const tokenPayload = {
    ...payload,
    iat: issuedAt,
    exp: expiresAt,
  };

  return jwt.sign(tokenPayload, JWT_SECRET);
}

/**
 * Verify and decode a JWT token
 */
export function verifyUserToken(token: string): UserPayload | null {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET environment variable is not configured');
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
