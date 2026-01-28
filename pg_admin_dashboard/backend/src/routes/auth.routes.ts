import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {
  validateAdminCredentials,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  requireAuth
} from '../middleware/auth.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { logAudit } from '../services/audit.service.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many login attempts, please try again later'
    }
  }
});

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }

    const user = await validateAdminCredentials(username, password);

    if (!user) {
      await logAudit({
        actor: username,
        action: 'login_failed',
        ipAddress: req.ip
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password'
        }
      };
      res.status(401).json(response);
      return;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await logAudit({
      actor: user.username,
      action: 'login_success',
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        },
        accessToken,
        refreshToken,
        expiresIn: 900 // 15 minutes
      }
    };
    res.json(response);
  })
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    const payload = verifyToken(refreshToken);

    if (!payload) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      };
      res.status(401).json(response);
      return;
    }

    const user = {
      id: payload.userId,
      username: payload.username,
      role: payload.role as 'admin' | 'editor' | 'viewer'
    };

    const newAccessToken = generateAccessToken(user);

    const response: ApiResponse = {
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: 900
      }
    };
    res.json(response);
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const response: ApiResponse = {
      success: true,
      data: {
        user: req.user
      }
    };
    res.json(response);
  })
);

// POST /api/auth/logout
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'logout',
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' }
    };
    res.json(response);
  })
);

export default router;
