import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
const adminPasswordHash = config.adminPasswordHash
    ? config.adminPasswordHash
    : bcrypt.hashSync(config.adminPassword, 12);
export function generateAccessToken(user) {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role
    };
    const options = { expiresIn: config.jwtExpiresIn };
    return jwt.sign(payload, config.jwtSecret, options);
}
export function generateRefreshToken(user) {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role
    };
    const options = { expiresIn: config.refreshTokenExpiresIn };
    return jwt.sign(payload, config.jwtSecret, options);
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, config.jwtSecret);
    }
    catch {
        return null;
    }
}
export async function validateAdminCredentials(username, password) {
    const isValidUser = username === config.adminId;
    const isValidPass = await bcrypt.compare(password, adminPasswordHash);
    if (!isValidUser || !isValidPass) {
        return null;
    }
    return {
        id: username,
        username,
        role: 'admin'
    };
}
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'No token provided'
            }
        });
        return;
    }
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid or expired token'
            }
        });
        return;
    }
    req.user = {
        id: payload.userId,
        username: payload.username,
        role: payload.role
    };
    next();
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Insufficient permissions'
                }
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map