import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { supabase } from '../lib/supabase.js';

export async function adminMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Check if user has admin role
    const { data: role, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.user.id)
      .eq('role', 'admin')
      .single();

    if (error || !role) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
}
