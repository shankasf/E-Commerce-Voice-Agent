import { Router } from 'express';
import type { Response } from 'express';
import { createAdminPool, getPoolForDb } from '../db/pool.js';
import { config } from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { logAudit } from '../services/audit.service.js';
import { isSafeIdentifier } from '../utils/validators.js';
import type { AuthenticatedRequest, ApiResponse, ServerStats, ConnectionInfo, LockInfo, SlowQueryInfo, ReplicationInfo, DatabaseSizeInfo } from '../types/index.js';

const router = Router();
const adminPool = createAdminPool(config.pg);

// GET /api/performance - Get server performance stats
router.get(
  '/',
  requireAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    // Server stats
    const versionResult = await adminPool.query('SELECT version();');
    const uptimeResult = await adminPool.query(
      `SELECT date_trunc('second', current_timestamp - pg_postmaster_start_time()) as uptime;`
    );
    const connectionsResult = await adminPool.query(
      `SELECT count(*) as active FROM pg_stat_activity WHERE state = 'active';`
    );
    const maxConnResult = await adminPool.query('SHOW max_connections;');
    const totalSizeResult = await adminPool.query(
      `SELECT SUM(pg_database_size(datname)) as total FROM pg_database WHERE datistemplate = false;`
    );
    const dbCountResult = await adminPool.query(
      `SELECT count(*) as count FROM pg_database WHERE datistemplate = false;`
    );

    // Active connections
    const activeConnsResult = await adminPool.query<ConnectionInfo>(
      `SELECT pid, datname, usename, client_addr::text, state, query,
              date_trunc('second', now() - query_start)::text as duration
       FROM pg_stat_activity
       WHERE pid <> pg_backend_pid()
       ORDER BY query_start DESC NULLS LAST
       LIMIT 50;`
    );

    // Database sizes
    const dbSizesResult = await adminPool.query<DatabaseSizeInfo>(
      `SELECT d.datname, pg_database_size(d.datname) as size_bytes,
              (SELECT count(*) FROM pg_stat_activity WHERE datname = d.datname)::int as numbackends
       FROM pg_database d
       WHERE datistemplate = false
       ORDER BY pg_database_size(d.datname) DESC;`
    );

    // Locks
    const locksResult = await adminPool.query<LockInfo>(
      `SELECT l.pid, d.datname, c.relname, l.locktype, l.mode, l.granted
       FROM pg_locks l
       LEFT JOIN pg_database d ON l.database = d.oid
       LEFT JOIN pg_class c ON l.relation = c.oid
       WHERE NOT l.granted OR l.locktype = 'relation'
       LIMIT 50;`
    );

    // Slow queries (if pg_stat_statements is available)
    let slowQueries: SlowQueryInfo[] = [];
    try {
      const slowResult = await adminPool.query<SlowQueryInfo>(
        `SELECT query, calls::int, total_exec_time as total_time,
                mean_exec_time as mean_time, rows::int
         FROM pg_stat_statements
         ORDER BY mean_exec_time DESC
         LIMIT 20;`
      );
      slowQueries = slowResult.rows;
    } catch (e) {
      // pg_stat_statements not available
    }

    // Replication status
    let replication: ReplicationInfo[] = [];
    try {
      const repResult = await adminPool.query<ReplicationInfo>(
        `SELECT client_addr::text, state, sent_lsn::text, write_lsn::text, replay_lag::text
         FROM pg_stat_replication;`
      );
      replication = repResult.rows;
    } catch (e) {
      // Not available
    }

    const stats: ServerStats = {
      version: versionResult.rows[0].version,
      uptime: uptimeResult.rows[0].uptime?.toString() || 'N/A',
      activeConnections: parseInt(connectionsResult.rows[0].active, 10),
      maxConnections: parseInt(maxConnResult.rows[0].max_connections, 10),
      totalSize: parseInt(totalSizeResult.rows[0].total, 10) || 0,
      databaseCount: parseInt(dbCountResult.rows[0].count, 10)
    };

    const response: ApiResponse = {
      success: true,
      data: {
        stats,
        connections: activeConnsResult.rows,
        databases: dbSizesResult.rows,
        locks: locksResult.rows,
        slowQueries,
        replication
      }
    };
    res.json(response);
  })
);

// POST /api/performance/connections/:pid/kill - Terminate connection
router.post(
  '/connections/:pid/kill',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { pid } = req.params;
    const pidNum = parseInt(pid, 10);

    if (isNaN(pidNum)) {
      throw new ValidationError('Invalid PID');
    }

    const result = await adminPool.query('SELECT pg_terminate_backend($1);', [pidNum]);

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'kill_connection',
      target: String(pidNum),
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Connection ${pidNum} terminated`,
        terminated: result.rows[0].pg_terminate_backend
      }
    };
    res.json(response);
  })
);

// POST /api/databases/:dbName/vacuum - Run VACUUM
router.post(
  '/databases/:dbName/vacuum',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;
    const { analyze = false } = req.body;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    const cmd = analyze ? 'VACUUM ANALYZE;' : 'VACUUM;';
    await dbPool.query(cmd);

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'vacuum',
      target: dbName,
      metadata: { analyze },
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: { message: `VACUUM${analyze ? ' ANALYZE' : ''} completed on ${dbName}` }
    };
    res.json(response);
  })
);

// POST /api/databases/:dbName/analyze - Run ANALYZE
router.post(
  '/databases/:dbName/analyze',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    await dbPool.query('ANALYZE;');

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'analyze',
      target: dbName,
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: { message: `ANALYZE completed on ${dbName}` }
    };
    res.json(response);
  })
);

export default router;
