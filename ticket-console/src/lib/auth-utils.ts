import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'urackit-device-auth-secret-change-in-production-2024';

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
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
