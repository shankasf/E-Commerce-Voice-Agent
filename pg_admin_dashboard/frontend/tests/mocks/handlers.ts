import { http, HttpResponse } from 'msw';

const API_URL = '/api';

// Mock data
export const mockUser = {
  id: 'test-user-id',
  username: 'testuser',
  role: 'admin',
};

export const mockDatabases = [
  { datname: 'test_db', size_bytes: 1000000, owner: 'postgres', datallowconn: true },
  { datname: 'production', size_bytes: 5000000, owner: 'postgres', datallowconn: true },
];

export const mockTables = [
  { table_schema: 'public', table_name: 'users' },
  { table_schema: 'public', table_name: 'posts' },
];

export const mockQueryResult = {
  rows: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ],
  rowCount: 2,
  fields: [
    { name: 'id', dataTypeID: 23 },
    { name: 'name', dataTypeID: 25 },
    { name: 'email', dataTypeID: 25 },
  ],
  command: 'SELECT',
  duration: 150,
};

export const mockBackups = [
  {
    filename: 'test_db_2024-01-15.sql',
    database: 'test_db',
    size: 1024000,
    created: '2024-01-15T10:30:00Z',
    format: 'plain',
  },
];

export const handlers = [
  // Auth handlers
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { username: string; password: string };

    if (body.username === 'testuser' && body.password === 'password') {
      return HttpResponse.json({
        success: true,
        data: {
          user: mockUser,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      });
    }
    return HttpResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
  }),

  http.post(`${API_URL}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_URL}/auth/me`, () => {
    return HttpResponse.json({
      success: true,
      data: { user: mockUser },
    });
  }),

  http.post(`${API_URL}/auth/refresh`, () => {
    return HttpResponse.json({
      success: true,
      data: { accessToken: 'new-mock-access-token' },
    });
  }),

  // Database handlers
  http.get(`${API_URL}/databases`, () => {
    return HttpResponse.json({
      success: true,
      data: mockDatabases,
    });
  }),

  http.get(`${API_URL}/databases/:dbName`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        tables: mockTables,
        size: 1000000,
      },
    });
  }),

  // Query handlers
  http.post(`${API_URL}/databases/:dbName/query`, async ({ request }) => {
    const body = await request.json() as { sql: string };

    if (body.sql.toLowerCase().includes('error')) {
      return HttpResponse.json({ success: false, message: 'SQL Error' }, { status: 400 });
    }

    return HttpResponse.json({
      success: true,
      data: mockQueryResult,
    });
  }),

  http.get(`${API_URL}/databases/:dbName/query/history`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: '1', sql: 'SELECT * FROM users', duration: 100, executedAt: new Date().toISOString() },
      ],
      meta: { total: 1, limit: 50, offset: 0 },
    });
  }),

  // Table handlers
  http.get(`${API_URL}/databases/:dbName/tables/:schema/:table`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        columns: [
          { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
          { column_name: 'name', data_type: 'text', is_nullable: 'YES' },
        ],
        rows: mockQueryResult.rows,
        rowCount: 2,
        indexes: [],
        foreignKeys: [],
      },
    });
  }),

  // Backup handlers
  http.get(`${API_URL}/databases/backups`, () => {
    return HttpResponse.json({
      success: true,
      data: mockBackups,
    });
  }),

  http.post(`${API_URL}/databases/:dbName/backup`, () => {
    return HttpResponse.json({
      success: true,
      data: mockBackups[0],
    });
  }),

  // Performance handlers
  http.get(`${API_URL}/performance`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        stats: {
          version: 'PostgreSQL 16.0',
          uptime: '10 days',
          activeConnections: 5,
          maxConnections: 100,
          totalSize: 10000000,
          databaseCount: 3,
        },
        connections: [],
        databases: mockDatabases.map(db => ({
          datname: db.datname,
          size_bytes: db.size_bytes,
          numbackends: 1,
        })),
        locks: [],
        slowQueries: [],
        replication: [],
      },
    });
  }),

  // Schema handlers
  http.get(`${API_URL}/schema/:dbName/full`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        tables: mockTables.map(t => ({
          schema_name: t.table_schema,
          table_name: t.table_name,
        })),
        views: [],
        extensions: [{ extname: 'pgcrypto', extversion: '1.3' }],
        functionsCount: 10,
        triggersCount: 2,
      },
    });
  }),

  http.get(`${API_URL}/schema/:dbName/views`, () => {
    return HttpResponse.json({
      success: true,
      data: [],
    });
  }),

  http.get(`${API_URL}/schema/:dbName/functions`, () => {
    return HttpResponse.json({
      success: true,
      data: [],
    });
  }),

  http.get(`${API_URL}/schema/:dbName/triggers`, () => {
    return HttpResponse.json({
      success: true,
      data: [],
    });
  }),
];
