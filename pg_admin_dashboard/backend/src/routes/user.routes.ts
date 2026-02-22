import { Router } from 'express';
import type { Response } from 'express';
import { config } from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { logAudit } from '../services/audit.service.js';
import { isSafeIdentifier, quoteIdent } from '../utils/validators.js';
import { adminPool } from './database.routes.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

// PostgreSQL 18.1 User/Role Management
// Note: md5 password authentication is deprecated in PostgreSQL 18.1
// SCRAM-SHA-256 is the recommended authentication method
// Reference: https://www.postgresql.org/docs/current/auth-password.html

const router = Router();

interface RoleInfo {
  rolname: string;
  rolsuper: boolean;
  rolinherit: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolcanlogin: boolean;
}

// GET /api/users - List all database roles
router.get(
  '/',
  requireAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const result = await adminPool.query<RoleInfo>(
      `SELECT rolname,
              rolsuper,
              rolinherit,
              rolcreatedb,
              rolcreaterole,
              rolcanlogin
       FROM pg_roles
       WHERE rolname !~ '^pg_'
       ORDER BY rolname;`
    );

    const response: ApiResponse<RoleInfo[]> = {
      success: true,
      data: result.rows
    };
    res.json(response);
  })
);

// POST /api/users - Create new role
// PostgreSQL 18.1: Uses SCRAM-SHA-256 for password hashing by default
// md5 password authentication is deprecated and will emit warnings
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { username, password, canCreateDb, canCreateRole, isSuperuser, connectionLimit } = req.body;

    if (!isSafeIdentifier(username)) {
      throw new ValidationError('Username must use letters, numbers, underscore, or hyphen');
    }

    if (!password || password.length < 10) {
      throw new ValidationError('Password must be at least 10 characters');
    }

    const flags = ['LOGIN'];
    if (canCreateDb) flags.push('CREATEDB');
    if (canCreateRole) flags.push('CREATEROLE');
    if (isSuperuser && config.allowSuperuserGrant) flags.push('SUPERUSER');
    // PostgreSQL 18.1: Connection limit per role
    if (connectionLimit && Number.isInteger(connectionLimit) && connectionLimit > 0) {
      flags.push(`CONNECTION LIMIT ${connectionLimit}`);
    }

    const flagClause = flags.join(' ');
    // Password will use SCRAM-SHA-256 by default in PostgreSQL 18.1
    await adminPool.query(
      `CREATE ROLE ${quoteIdent(username)} WITH ${flagClause} PASSWORD $1;`,
      [password]
    );

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'create_user',
      target: username,
      metadata: {
        createdb: Boolean(canCreateDb),
        createrole: Boolean(canCreateRole),
        superuser: Boolean(isSuperuser && config.allowSuperuserGrant),
        connectionLimit: connectionLimit || null,
        // Note: PostgreSQL 18.1 uses SCRAM-SHA-256 by default
        authMethod: 'scram-sha-256'
      },
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: { username, authMethod: 'scram-sha-256' }
    };
    res.status(201).json(response);
  })
);

// DELETE /api/users/:username - Delete role
router.delete(
  '/:username',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { username } = req.params;

    if (!isSafeIdentifier(username)) {
      throw new ValidationError('Invalid username');
    }

    await adminPool.query(`DROP ROLE ${quoteIdent(username)};`);

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'delete_user',
      target: username,
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: { message: `User '${username}' deleted` }
    };
    res.json(response);
  })
);

// PATCH /api/users/:username/password - Change user password
router.patch(
  '/:username/password',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { username } = req.params;
    const { password } = req.body;

    if (!isSafeIdentifier(username)) {
      throw new ValidationError('Invalid username');
    }

    if (!password || password.length < 10) {
      throw new ValidationError('Password must be at least 10 characters');
    }

    await adminPool.query(
      `ALTER ROLE ${quoteIdent(username)} WITH PASSWORD $1;`,
      [password]
    );

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'change_password',
      target: username,
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: { message: 'Password updated' }
    };
    res.json(response);
  })
);

// POST /api/users/:username/grant - Grant database privileges
router.post(
  '/:username/grant',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { username } = req.params;
    const { database } = req.body;

    if (!isSafeIdentifier(username) || !isSafeIdentifier(database)) {
      throw new ValidationError('Invalid user or database name');
    }

    await adminPool.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${quoteIdent(database)} TO ${quoteIdent(username)};`
    );

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'grant_database',
      target: `${database}:${username}`,
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: { message: `Granted '${username}' access to '${database}'` }
    };
    res.json(response);
  })
);

// POST /api/users/:username/revoke - Revoke database privileges
router.post(
  '/:username/revoke',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { username } = req.params;
    const { database } = req.body;

    if (!isSafeIdentifier(username) || !isSafeIdentifier(database)) {
      throw new ValidationError('Invalid user or database name');
    }

    await adminPool.query(
      `REVOKE ALL PRIVILEGES ON DATABASE ${quoteIdent(database)} FROM ${quoteIdent(username)};`
    );

    await logAudit({
      actor: req.user?.username || 'unknown',
      action: 'revoke_database',
      target: `${database}:${username}`,
      ipAddress: req.ip
    });

    const response: ApiResponse = {
      success: true,
      data: { message: `Revoked '${username}' access from '${database}'` }
    };
    res.json(response);
  })
);

export default router;
