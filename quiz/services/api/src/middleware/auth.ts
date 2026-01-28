import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { supabase } from '../lib/supabase.js';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  token?: string;
}

// Get Supabase URL and derive JWKS endpoint
const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error('SUPABASE_URL not configured');
}

// JWKS client for fetching public keys
const client = jwksClient({
  jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

// Get signing key from JWKS
function getKey(header: JwtHeader, callback: SigningKeyCallback): void {
  if (!header.kid) {
    callback(new Error('No kid in token header'));
    return;
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// Promisified JWT verification with JWKS
function verifyToken(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['ES256', 'RS256'], // Support both ECC and RSA
        issuer: `${supabaseUrl}/auth/v1`, // Validate issuer
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as jwt.JwtPayload);
        }
      }
    );
  });
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify JWT using JWKS
    const decoded = await verifyToken(token);

    if (!decoded.sub) {
      res.status(401).json({ error: 'Invalid token: missing subject' });
      return;
    }

    // Get user profile from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', decoded.sub)
      .single();

    req.user = {
      id: decoded.sub,
      email: profile?.email || decoded.email || '',
      name: profile?.name || decoded.user_metadata?.name
    };
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
}
