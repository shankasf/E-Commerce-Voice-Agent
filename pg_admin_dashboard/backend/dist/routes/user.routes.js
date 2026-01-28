import { Router } from 'express';
import { config } from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { logAudit } from '../services/audit.service.js';
import { isSafeIdentifier, quoteIdent } from '../utils/validators.js';
import { adminPool } from './database.routes.js';
const router = Router();
// GET /api/users - List all database roles
router.get('/', requireAuth, asyncHandler(async (_req, res) => {
    const result = await adminPool.query(`SELECT rolname,
              rolsuper,
              rolinherit,
              rolcreatedb,
              rolcreaterole,
              rolcanlogin
       FROM pg_roles
       WHERE rolname !~ '^pg_'
       ORDER BY rolname;`);
    const response = {
        success: true,
        data: result.rows
    };
    res.json(response);
}));
// POST /api/users - Create new role
router.post('/', requireAuth, asyncHandler(async (req, res) => {
    const { username, password, canCreateDb, canCreateRole, isSuperuser } = req.body;
    if (!isSafeIdentifier(username)) {
        throw new ValidationError('Username must use letters, numbers, underscore, or hyphen');
    }
    if (!password || password.length < 10) {
        throw new ValidationError('Password must be at least 10 characters');
    }
    const flags = ['LOGIN'];
    if (canCreateDb)
        flags.push('CREATEDB');
    if (canCreateRole)
        flags.push('CREATEROLE');
    if (isSuperuser && config.allowSuperuserGrant)
        flags.push('SUPERUSER');
    const flagClause = flags.join(' ');
    await adminPool.query(`CREATE ROLE ${quoteIdent(username)} WITH ${flagClause} PASSWORD $1;`, [password]);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'create_user',
        target: username,
        metadata: {
            createdb: Boolean(canCreateDb),
            createrole: Boolean(canCreateRole),
            superuser: Boolean(isSuperuser && config.allowSuperuserGrant)
        },
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: { username }
    };
    res.status(201).json(response);
}));
// DELETE /api/users/:username - Delete role
router.delete('/:username', requireAuth, asyncHandler(async (req, res) => {
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
    const response = {
        success: true,
        data: { message: `User '${username}' deleted` }
    };
    res.json(response);
}));
// PATCH /api/users/:username/password - Change user password
router.patch('/:username/password', requireAuth, asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { password } = req.body;
    if (!isSafeIdentifier(username)) {
        throw new ValidationError('Invalid username');
    }
    if (!password || password.length < 10) {
        throw new ValidationError('Password must be at least 10 characters');
    }
    await adminPool.query(`ALTER ROLE ${quoteIdent(username)} WITH PASSWORD $1;`, [password]);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'change_password',
        target: username,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: { message: 'Password updated' }
    };
    res.json(response);
}));
// POST /api/users/:username/grant - Grant database privileges
router.post('/:username/grant', requireAuth, asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { database } = req.body;
    if (!isSafeIdentifier(username) || !isSafeIdentifier(database)) {
        throw new ValidationError('Invalid user or database name');
    }
    await adminPool.query(`GRANT ALL PRIVILEGES ON DATABASE ${quoteIdent(database)} TO ${quoteIdent(username)};`);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'grant_database',
        target: `${database}:${username}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: { message: `Granted '${username}' access to '${database}'` }
    };
    res.json(response);
}));
// POST /api/users/:username/revoke - Revoke database privileges
router.post('/:username/revoke', requireAuth, asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { database } = req.body;
    if (!isSafeIdentifier(username) || !isSafeIdentifier(database)) {
        throw new ValidationError('Invalid user or database name');
    }
    await adminPool.query(`REVOKE ALL PRIVILEGES ON DATABASE ${quoteIdent(database)} FROM ${quoteIdent(username)};`);
    await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'revoke_database',
        target: `${database}:${username}`,
        ipAddress: req.ip
    });
    const response = {
        success: true,
        data: { message: `Revoked '${username}' access from '${database}'` }
    };
    res.json(response);
}));
export default router;
//# sourceMappingURL=user.routes.js.map