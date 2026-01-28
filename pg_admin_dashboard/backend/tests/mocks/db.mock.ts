import { jest } from '@jest/globals';

// Mock query result factory
export const createMockQueryResult = (rows: unknown[] = [], rowCount: number | null = null) => ({
  rows,
  rowCount: rowCount ?? rows.length,
  fields: rows.length > 0 ? Object.keys(rows[0] as object).map(name => ({ name, dataTypeID: 25 })) : [],
  command: 'SELECT',
  oid: 0,
});

// Mock pool client
export const createMockClient = () => ({
  query: jest.fn(),
  release: jest.fn(),
});

// Mock pool
export const createMockPool = () => {
  const mockClient = createMockClient();
  return {
    query: jest.fn().mockResolvedValue(createMockQueryResult()),
    connect: jest.fn().mockResolvedValue(mockClient),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
  };
};

// Default mock pool instance
export const mockPool = createMockPool();

// Mock the pool module
export const mockPoolModule = {
  createAdminPool: jest.fn().mockReturnValue(mockPool),
  getPoolForDb: jest.fn().mockReturnValue(mockPool),
};

// Helper to setup common query mocks
export const setupDatabaseMocks = (pool: ReturnType<typeof createMockPool>) => {
  // Mock version query
  pool.query.mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT version()')) {
      return createMockQueryResult([{ version: 'PostgreSQL 16.0' }]);
    }
    if (sql.includes('pg_stat_activity')) {
      return createMockQueryResult([
        { pid: 1, datname: 'test_db', usename: 'test_user', state: 'active', query: 'SELECT 1' },
      ]);
    }
    if (sql.includes('pg_database')) {
      return createMockQueryResult([
        { datname: 'test_db', size_bytes: 1000000, owner: 'test_user' },
      ]);
    }
    return createMockQueryResult();
  });
};
