import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AdminTokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export function verifyAdminToken(request: NextRequest): {
  valid: boolean;
  payload?: AdminTokenPayload;
  error?: string;
} {
  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
    return { valid: true, payload: decoded };
  } catch {
    return { valid: false, error: 'Invalid or expired token' };
  }
}
