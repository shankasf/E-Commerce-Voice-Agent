import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest, JwtPayload, User } from '../types/index.js';
export declare function generateAccessToken(user: User): string;
export declare function generateRefreshToken(user: User): string;
export declare function verifyToken(token: string): JwtPayload | null;
export declare function validateAdminCredentials(username: string, password: string): Promise<User | null>;
export declare function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map