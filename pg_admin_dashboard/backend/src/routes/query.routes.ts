import { Router } from 'express';
import type { Response } from 'express';
import { getPoolForDb } from '../db/pool.js';
import { config } from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { logAudit } from '../services/audit.service.js';
import { saveQueryToHistory, getQueryHistory, clearQueryHistory, getQueryById } from '../services/queryHistory.service.js';
import { isSafeIdentifier } from '../utils/validators.js';
import type { AuthenticatedRequest, ApiResponse, QueryResult } from '../types/index.js';

const router = Router();

// Helper function to convert query result to CSV
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  const columns = Object.keys(rows[0]);
  let csv = columns.join(',') + '\n';

  for (const row of rows) {
    const values = columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    csv += values.join(',') + '\n';
  }

  return csv;
}

// POST /api/databases/:dbName/query - Execute SQL query
router.post(
  '/:dbName/query',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;
    const { sql, saveToHistory = true } = req.body;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      throw new ValidationError('No SQL query provided');
    }

    // Security: limit query length
    if (sql.length > 50000) {
      throw new ValidationError('Query too long (max 50000 characters)');
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    const start = Date.now();

    const result = await dbPool.query(sql);
    const duration = Date.now() - start;

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'execute_query',
      target: dbName,
      metadata: { query: sql.substring(0, 500), duration },
      ipAddress: req.ip
    });

    // Save to query history
    if (saveToHistory) {
      try {
        await saveQueryToHistory({
          database: dbName,
          sql: sql.substring(0, 10000), // Limit stored SQL length
          duration,
          rowCount: result.rowCount,
          command: result.command || '',
          userId: req.user?.username || 'unknown'
        });
      } catch (e) {
        // Don't fail the query if history save fails
        console.error('Failed to save query to history:', e);
      }
    }

    const queryResult: QueryResult = {
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })) || [],
      command: result.command || '',
      duration
    };

    const response: ApiResponse<QueryResult> = {
      success: true,
      data: queryResult
    };
    res.json(response);
  })
);

// POST /api/databases/:dbName/query/explain - Execute EXPLAIN on query
// PostgreSQL 18.1: EXPLAIN ANALYZE now automatically includes BUFFERS
// Reference: https://www.postgresql.org/docs/current/sql-explain.html
router.post(
  '/:dbName/query/explain',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;
    const { sql, analyze = false, buffers = false, format = 'text', verbose = false, costs = true, timing = true } = req.body;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      throw new ValidationError('No SQL query provided');
    }

    if (sql.length > 50000) {
      throw new ValidationError('Query too long (max 50000 characters)');
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    const options = [];

    // PostgreSQL 18.1: ANALYZE automatically includes BUFFERS
    // But we can still explicitly control it if needed
    if (analyze) options.push('ANALYZE');
    if (buffers && !analyze) options.push('BUFFERS'); // Only add if not using ANALYZE (PG 18.1 auto-includes it)
    if (verbose) options.push('VERBOSE');
    if (!costs) options.push('COSTS false');
    if (!timing && analyze) options.push('TIMING false');
    if (format === 'json') options.push('FORMAT JSON');

    const explainSql = `EXPLAIN ${options.length > 0 ? `(${options.join(', ')})` : ''} ${sql}`;
    const result = await dbPool.query(explainSql);

    const response: ApiResponse = {
      success: true,
      data: {
        plan: result.rows,
        format,
        // PostgreSQL 18.1 note: ANALYZE includes BUFFERS automatically
        buffersIncluded: analyze || buffers
      }
    };
    res.json(response);
  })
);

// POST /api/databases/:dbName/query/export/csv - Export query result as CSV
router.post(
  '/:dbName/query/export/csv',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;
    const { sql } = req.body;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      throw new ValidationError('No SQL query provided');
    }

    if (sql.length > 50000) {
      throw new ValidationError('Query too long (max 50000 characters)');
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    const result = await dbPool.query(sql);

    if (result.rows.length === 0) {
      throw new ValidationError('No data to export');
    }

    const csv = toCSV(result.rows);
    const filename = `export_${dbName}_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  })
);

// GET /api/databases/:dbName/query/history - Get query history
router.get(
  '/:dbName/query/history',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;
    const limit = Math.min(Number.parseInt(req.query.limit as string || '50', 10), 100);
    const offset = Number.parseInt(req.query.offset as string || '0', 10);

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const { entries, total } = await getQueryHistory(dbName, limit, offset);

    const response: ApiResponse = {
      success: true,
      data: entries,
      meta: { limit, offset, total }
    };
    res.json(response);
  })
);

// GET /api/databases/:dbName/query/history/:queryId - Get specific query from history
router.get(
  '/:dbName/query/history/:queryId',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName, queryId } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const query = await getQueryById(dbName, queryId);
    if (!query) {
      throw new NotFoundError('Query not found in history');
    }

    const response: ApiResponse = {
      success: true,
      data: query
    };
    res.json(response);
  })
);

// DELETE /api/databases/:dbName/query/history - Clear query history
router.delete(
  '/:dbName/query/history',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    await clearQueryHistory(dbName);

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'clear_query_history',
      target: dbName,
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: { message: `Query history cleared for ${dbName}` }
    };
    res.json(response);
  })
);

export default router;
