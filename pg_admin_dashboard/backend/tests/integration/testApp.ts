import express from 'express';
import cors from 'cors';
import { jest } from '@jest/globals';

// Create a minimal test app
export function createTestApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  return app;
}

// Mock authentication middleware for testing
export const mockAuth = (userId = 'test-user-id', username = 'testuser', role = 'admin') => {
  return (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as any).user = { id: userId, username, role };
    next();
  };
};

// Create mock request/response for unit testing middleware
export const createMockRequest = (overrides: Partial<express.Request> = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ip: '127.0.0.1',
  ...overrides,
} as express.Request);

export const createMockResponse = () => {
  const res: Partial<express.Response> = {
    status: jest.fn().mockReturnThis() as any,
    json: jest.fn().mockReturnThis() as any,
    send: jest.fn().mockReturnThis() as any,
    setHeader: jest.fn().mockReturnThis() as any,
    download: jest.fn().mockReturnThis() as any,
  };
  return res as express.Response;
};

export const createMockNext = () => jest.fn() as express.NextFunction;
