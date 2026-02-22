import { Router } from 'express';
import type { Response } from 'express';
import { createAdminPool, getPoolForDb } from '../db/pool.js';
import { config } from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { logAudit } from '../services/audit.service.js';
import { isSafeIdentifier, quoteIdent } from '../utils/validators.js';
import type { AuthenticatedRequest, ApiResponse, DatabaseInfo, TableInfo } from '../types/index.js';

// PostgreSQL 18.1 Database Management Routes
// Reference: https://www.postgresql.org/docs/current/managing-databases.html
// Note: Data checksums are now enabled by default in PostgreSQL 18.1

const router = Router();
const adminPool = createAdminPool(config.pg);

// GET /api/databases - List all databases
router.get(
  '/',
  requireAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const result = await adminPool.query<DatabaseInfo>(
      `SELECT datname,
              pg_database_size(datname) AS size_bytes,
              pg_get_userbyid(datdba) AS owner,
              datallowconn
       FROM pg_database
       WHERE datistemplate = false
       ORDER BY datname;`
    );

    const response: ApiResponse<DatabaseInfo[]> = {
      success: true,
      data: result.rows
    };
    res.json(response);
  })
);

// POST /api/databases - Create database
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, owner } = req.body;

    if (!name || !isSafeIdentifier(name)) {
      throw new ValidationError('Database name must use letters, numbers, underscore, or hyphen');
    }

    if (owner && !isSafeIdentifier(owner)) {
      throw new ValidationError('Owner name must use letters, numbers, underscore, or hyphen');
    }

    const ownerClause = owner ? ` OWNER ${quoteIdent(owner)}` : '';
    await adminPool.query(`CREATE DATABASE ${quoteIdent(name)}${ownerClause};`);

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'create_database',
      target: name,
      metadata: { owner: owner || null },
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: { name, owner: owner || null }
    };
    res.status(201).json(response);
  })
);

// GET /api/databases/:dbName - Get database details
router.get(
  '/:dbName',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    // Get database info
    const dbResult = await adminPool.query<DatabaseInfo>(
      `SELECT datname,
              pg_database_size(datname) AS size_bytes,
              pg_get_userbyid(datdba) AS owner,
              datallowconn
       FROM pg_database
       WHERE datname = $1;`,
      [dbName]
    );

    if (dbResult.rows.length === 0) {
      throw new NotFoundError(`Database '${dbName}' not found`);
    }

    // Get tables
    const dbPool = getPoolForDb(config.pg, dbName);
    const tablesResult = await dbPool.query<TableInfo>(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema NOT IN ('pg_catalog', 'information_schema')
       ORDER BY table_schema, table_name;`
    );

    const response: ApiResponse = {
      success: true,
      data: {
        ...dbResult.rows[0],
        tables: tablesResult.rows
      }
    };
    res.json(response);
  })
);

// DELETE /api/databases/:dbName - Drop database
router.delete(
  '/:dbName',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;
    const { confirm } = req.body;

    if (!config.allowDbDrop) {
      throw new ValidationError('Dropping databases is disabled');
    }

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    if (confirm !== dbName) {
      throw new ValidationError('Confirmation name does not match');
    }

    await adminPool.query(`DROP DATABASE ${quoteIdent(dbName)};`);

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'drop_database',
      target: dbName,
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: { message: `Database '${dbName}' dropped` }
    };
    res.json(response);
  })
);

// GET /api/databases/:dbName/schemas - List schemas
router.get(
  '/:dbName/schemas',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    const dbPool = getPoolForDb(config.pg, dbName);
    const result = await dbPool.query(
      `SELECT schema_name
       FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
       ORDER BY schema_name;`
    );

    const response: ApiResponse = {
      success: true,
      data: result.rows.map(r => r.schema_name)
    };
    res.json(response);
  })
);

// GET /api/databases/:dbName/roles - Get roles for database
router.get(
  '/:dbName/roles',
  requireAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const result = await adminPool.query(
      `SELECT rolname
       FROM pg_roles
       WHERE rolname !~ '^pg_'
       ORDER BY rolname;`
    );

    const response: ApiResponse = {
      success: true,
      data: result.rows.map(r => r.rolname)
    };
    res.json(response);
  })
);

export { adminPool };
export default router;
