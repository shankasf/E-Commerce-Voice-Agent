import { jest, afterAll } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.PG_HOST = 'localhost';
process.env.PG_PORT = '5432';
process.env.PG_USER = 'test_user';
process.env.PG_PASSWORD = 'test_password';
process.env.PG_DATABASE = 'test_db';
process.env.BACKUP_DIR = '/tmp/test-backups';
process.env.QUERY_HISTORY_DIR = '/tmp/test-query-history';

// Global test timeout
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Allow any pending async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Mock console methods to reduce noise in tests (optional)
// Uncomment if you want cleaner test output
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
