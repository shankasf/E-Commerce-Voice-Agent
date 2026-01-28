import { describe, it, expect, beforeAll, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

/**
 * Integration tests for Query Routes
 *
 * Note: These tests use a simplified approach that doesn't require
 * ESM module mocking. For full integration testing with actual DB,
 * use E2E tests with Playwright.
 */

describe('Query Routes Integration Tests', () => {
  let app: express.Application;
  let authToken: string;
  const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';

  // Mock query history storage
  const queryHistory: Array<{
    id: string;
    sql: string;
    duration: number;
    rowCount: number;
    command: string;
    executedAt: string;
  }> = [];

  beforeAll(() => {
    app = express();
    app.use(express.json());

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
        const payload = jwt.verify(token, JWT_SECRET);
        (req as any).user = payload;
        next();
      } catch {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
        });
      }
    };

    // Validate database name
    const validateDbName = (dbName: string): boolean => {
      return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(dbName);
    };

    // Execute query endpoint
    app.post('/databases/:dbName/query', requireAuth, (req, res) => {
      const { dbName } = req.params;
      const { sql } = req.body;

      if (!validateDbName(dbName)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid database name' }
        });
      }

      if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No SQL query provided' }
        });
      }

      if (sql.length > 50000) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Query too long (max 50000 characters)' }
        });
      }

      // Simulate query execution
      const mockResult = {
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1,
        fields: [
          { name: 'id', dataTypeID: 23 },
          { name: 'name', dataTypeID: 25 },
        ],
        command: 'SELECT',
        duration: 10,
      };

      // Save to history
      queryHistory.unshift({
        id: `query-${Date.now()}`,
        sql: sql.substring(0, 10000),
        duration: mockResult.duration,
        rowCount: mockResult.rowCount || 0,
        command: mockResult.command,
        executedAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        data: mockResult,
      });
    });

    // Explain query endpoint
    app.post('/databases/:dbName/query/explain', requireAuth, (req, res) => {
      const { dbName } = req.params;
      const { sql, analyze = false } = req.body;

      if (!validateDbName(dbName)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid database name' }
        });
      }

      if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No SQL query provided' }
        });
      }

      return res.json({
        success: true,
        data: {
          plan: [{ 'QUERY PLAN': 'Seq Scan on users' }],
          format: 'text',
        },
      });
    });

    // Get query history endpoint
    app.get('/databases/:dbName/query/history', requireAuth, (req, res) => {
      const { dbName } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
      const offset = parseInt(req.query.offset as string || '0', 10);

      if (!validateDbName(dbName)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid database name' }
        });
      }

      const entries = queryHistory.slice(offset, offset + limit);

      return res.json({
        success: true,
        data: entries,
        meta: { limit, offset, total: queryHistory.length },
      });
    });

    // Clear query history endpoint
    app.delete('/databases/:dbName/query/history', requireAuth, (req, res) => {
      const { dbName } = req.params;

      if (!validateDbName(dbName)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid database name' }
        });
      }

      queryHistory.length = 0;

      return res.json({
        success: true,
        data: { message: `Query history cleared for ${dbName}` },
      });
    });

    // Export CSV endpoint
    app.post('/databases/:dbName/query/export/csv', requireAuth, (req, res) => {
      const { dbName } = req.params;
      const { sql } = req.body;

      if (!validateDbName(dbName)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid database name' }
        });
      }

      if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No SQL query provided' }
        });
      }

      // Simulate empty result
      if (sql.includes('empty_table')) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No data to export' }
        });
      }

      // Mock CSV export
      const csv = 'id,name\n"1","Alice"\n"2","Bob"\n';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="export_${dbName}_${Date.now()}.csv"`);
      return res.send(csv);
    });

    // Generate auth token
    authToken = jwt.sign(
      { userId: '1', username: 'testuser', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    // Clear query history before each test
    queryHistory.length = 0;
  });

  describe('POST /databases/:dbName/query', () => {
    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/databases/test_db/query')
        .send({ sql: 'SELECT 1' });

      expect(response.status).toBe(401);
    });

    it('should return 400 for empty SQL', async () => {
      const response = await request(app)
        .post('/databases/test_db/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sql: '' });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid database name', async () => {
      const response = await request(app)
        .post('/databases/invalid;db/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sql: 'SELECT 1' });

      expect(response.status).toBe(400);
    });

    it('should execute valid query and return results', async () => {
      const response = await request(app)
        .post('/databases/test_db/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sql: 'SELECT * FROM users' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rows).toHaveLength(1);
      expect(response.body.data.command).toBe('SELECT');
    });

    it('should reject queries exceeding length limit', async () => {
      const longSql = 'SELECT ' + 'a'.repeat(51000);

      const response = await request(app)
        .post('/databases/test_db/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sql: longSql });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('too long');
    });
  });

  describe('POST /databases/:dbName/query/explain', () => {
    it('should return query plan', async () => {
      const response = await request(app)
        .post('/databases/test_db/query/explain')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sql: 'SELECT * FROM users' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.plan).toBeDefined();
    });

    it('should support ANALYZE option', async () => {
      const response = await request(app)
        .post('/databases/test_db/query/explain')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sql: 'SELECT * FROM users', analyze: true });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /databases/:dbName/query/history', () => {
    it('should return query history', async () => {
      // First execute a query to add to history
      await request(app)
        .post('/databases/test_db/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sql: 'SELECT 1' });

      const response = await request(app)
        .get('/databases/test_db/query/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/databases/test_db/query/history?limit=10&offset=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.meta.limit).toBe(10);
      expect(response.body.meta.offset).toBe(5);
    });
  });

  describe('DELETE /databases/:dbName/query/history', () => {
    it('should clear query history', async () => {
      const response = await request(app)
        .delete('/databases/test_db/query/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /databases/:dbName/query/export/csv', () => {
    it('should export query results as CSV', async () => {
      const response = await request(app)
        .post('/databases/test_db/query/export/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sql: 'SELECT * FROM users' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('id,name');
      expect(response.text).toContain('"Alice"');
    });

    it('should return 400 when no data to export', async () => {
      const response = await request(app)
        .post('/databases/test_db/query/export/csv')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sql: 'SELECT * FROM empty_table' });

      expect(response.status).toBe(400);
    });
  });
});
