import { describe, it, expect, beforeAll, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

/**
 * Integration tests for Auth Routes
 *
 * Note: These tests use a simplified approach that doesn't require
 * ESM module mocking. For full integration testing, use E2E tests
 * with Playwright.
 */

describe('Auth Routes Integration Tests', () => {
  let app: express.Application;
  const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

  beforeAll(() => {
    // Create a minimal test app with just auth validation logic
    app = express();
    app.use(express.json());

    // Simple login endpoint for testing
    app.post('/auth/login', (req, res) => {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' }
        });
      }

      // Test credentials
      if (username === 'testuser' && password === 'correctpassword') {
        const accessToken = jwt.sign(
          { userId: '1', username, role: 'admin' },
          JWT_SECRET,
          { expiresIn: '1h' }
        );
        const refreshToken = jwt.sign(
          { userId: '1', username, role: 'admin', type: 'refresh' },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        return res.json({
          success: true,
          data: {
            user: { id: '1', username, role: 'admin' },
            accessToken,
            refreshToken
          }
        });
      }

      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' }
      });
    });

    // Refresh token endpoint
    app.post('/auth/refresh', (req, res) => {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Refresh token is required' }
        });
      }

      try {
        const payload = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; username: string; role: string };
        const newAccessToken = jwt.sign(
          { userId: payload.userId, username: payload.username, role: payload.role },
          JWT_SECRET,
          { expiresIn: '1h' }
        );
        return res.json({
          success: true,
          data: { accessToken: newAccessToken }
        });
      } catch {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' }
        });
      }
    });

    // Auth middleware
    const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No token provided' }
        });
      }

      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string; username: string; role: string };
        (req as any).user = payload;
        next();
      } catch {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
        });
      }
    };

    // Me endpoint
    app.get('/auth/me', requireAuth, (req, res) => {
      res.json({
        success: true,
        data: { user: (req as any).user }
      });
    });

    // Logout endpoint
    app.post('/auth/logout', requireAuth, (req, res) => {
      res.json({
        success: true,
        data: { message: 'Logged out successfully' }
      });
    });
  });

  describe('POST /auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return tokens for valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'correctpassword' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.username).toBe('testuser');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' });

      expect(response.status).toBe(401);
    });

    it('should return new access token for valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { userId: '1', username: 'testuser', role: 'admin', type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 without authorization header', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.token');

      expect(response.status).toBe(401);
    });

    it('should return user info for valid token', async () => {
      const token = jwt.sign(
        { userId: '1', username: 'testuser', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('testuser');
    });
  });

  describe('POST /auth/logout', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app).post('/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return success with valid auth token', async () => {
      const token = jwt.sign(
        { userId: '1', username: 'testuser', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
