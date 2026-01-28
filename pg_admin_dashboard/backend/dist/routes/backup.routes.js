import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { logAudit } from '../services/audit.service.js';
import { isSafeIdentifier } from '../utils/validators.js';
const router = Router();
const execAsync = promisify(exec);
// Build environment with PostgreSQL password for shell commands
function getPgEnv() {
    return {
        ...process.env,
        PGPASSWORD: config.pg.password,
    };
}
// Ensure backup directory exists
async function ensureBackupDir() {
    await fs.mkdir(config.backupDir, { recursive: true });
}
// Validate filename for path traversal attacks
function isValidFilename(filename) {
    return !filename.includes('..') && !filename.includes('/') && !filename.includes('\\');
}
// GET /api/databases/backups - List all backups (all databases)
// NOTE: This route MUST come before /:dbName/backups to avoid matching "backups" as dbName
router.get('/backups', requireAuth, asyncHandler(async (_req, res) => {
    await ensureBackupDir();
    const backups = [];
    try {
        const files = await fs.readdir(config.backupDir);
        for (const file of files) {
            if (file.endsWith('.sql') || file.endsWith('.dump') || file.endsWith('.tar') || file.endsWith('.gz')) {
                const stat = await fs.stat(path.join(config.backupDir, file));
                const match = file.match(/^(.+?)_(\d{4}-\d{2}-\d{2})/);
                backups.push({
                    filename: file,
                    database: match ? match[1] : 'unknown',
                    size: stat.size,
                    created: stat.mtime.toISOString(),
                    format: file.endsWith('.dump') ? 'custom' : file.endsWith('.tar') ? 'tar' : 'plain'
                });
            }
        }
        backups.sort((a, b) => b.created.localeCompare(a.created));
    }
    catch (e) {
        // Directory might not exist yet
    }
    const response = {
        success: true,
        data: backups
    };
    res.json(response);
}));
// GET /api/databases/:dbName/backups - List backups for specific database
router.get('/:dbName/backups', requireAuth, asyncHandler(async (req, res) => {
    const { dbName } = req.params;
    if (!isSafeIdentifier(dbName)) {
        throw new ValidationError('Invalid database name');
    }
    await ensureBackupDir();
    const backups = [];
    try {
        const files = await fs.readdir(config.backupDir);
        for (const file of files) {
            if (file.endsWith('.sql') || file.endsWith('.dump') || file.endsWith('.tar') || file.endsWith('.gz')) {
                const stat = await fs.stat(path.join(config.backupDir, file));
                const match = file.match(/^(.+?)_(\d{4}-\d{2}-\d{2})/);
                const fileDb = match ? match[1] : null;
                // Filter by database name if it matches
                if (!fileDb || fileDb === dbName) {
                    backups.push({
                        filename: file,
                        database: fileDb || dbName,
                        size: stat.size,
                        created: stat.mtime.toISOString(),
                        format: file.endsWith('.dump') ? 'custom' : file.endsWith('.tar') ? 'tar' : 'plain'
                    });
                }
            }
        }
        backups.sort((a, b) => b.created.localeCompare(a.created));
    }
    catch (e) {
        // Directory might not exist yet
    }
    const response = {
        success: true,
        data: backups
    };
    res.json(response);
}));
// POST /api/databases/:dbName/backup - Create backup
router.post('/:dbName/backup', requireAuth, asyncHandler(async (req, res) => {
    const { dbName } = req.params;
    const { format = 'plain', schemaOnly = false, dataOnly = false, compress = false } = req.body;
    if (!isSafeIdentifier(dbName)) {
        throw new ValidationError('Invalid database name');
    }
    await ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    let ext = format === 'custom' ? 'dump' : format === 'tar' ? 'tar' : 'sql';
    if (compress && ext === 'sql')
        ext = 'sql.gz';
    const filename = `${dbName}_${timestamp}.${ext}`;
    const filepath = path.join(config.backupDir, filename);
    let cmd = `pg_dump -h ${config.pg.host} -p ${config.pg.port} -U ${config.pg.user}`;
    if (format === 'custom')
        cmd += ' -Fc';
    else if (format === 'tar')
        cmd += ' -Ft';
    else
        cmd += ' -Fp';
    if (schemaOnly)
        cmd += ' --schema-only';
    if (dataOnly)
        cmd += ' --data-only';
    cmd += ` ${dbName}`;
    if (compress && format === 'plain') {
        cmd += ` | gzip > "${filepath}"`;
    }
    else {
        cmd += ` > "${filepath}"`;
    }
    try {
        await execAsync(cmd, { shell: '/bin/bash', env: getPgEnv() });
        await logAudit({
            actor: req.user?.username || 'unknown',
            action: 'create_backup',
            target: dbName,
            metadata: { filename, format, schemaOnly, dataOnly, compress },
            ipAddress: req.ip
        });
        const stat = await fs.stat(filepath);
        const backup = {
            filename,
            database: dbName,
            size: stat.size,
            created: stat.mtime.toISOString(),
            format: format
        };
        const response = {
            success: true,
            data: backup
        };
        res.status(201).json(response);
    }
    catch (err) {
        throw new ValidationError(`Backup failed: ${err.message}`);
    }
}));
// GET /api/databases/:dbName/backups/:filename/download - Download backup
router.get('/:dbName/backups/:filename/download', requireAuth, asyncHandler(async (req, res) => {
    const { filename } = req.params;
    if (!isValidFilename(filename)) {
        throw new ValidationError('Invalid filename');
    }
    const filepath = path.join(config.backupDir, filename);
    try {
        await fs.access(filepath);
        res.download(filepath);
    }
    catch (e) {
        throw new NotFoundError('Backup file not found');
    }
}));
// DELETE /api/databases/:dbName/backups/:filename - Delete backup
router.delete('/:dbName/backups/:filename', requireAuth, asyncHandler(async (req, res) => {
    const { filename } = req.params;
    if (!isValidFilename(filename)) {
        throw new ValidationError('Invalid filename');
    }
    const filepath = path.join(config.backupDir, filename);
    try {
        await fs.unlink(filepath);
        await logAudit({
            actor: req.user?.username || 'unknown',
            action: 'delete_backup',
            target: filename,
            ipAddress: req.ip
        });
        const response = {
            success: true,
            data: { message: `Backup ${filename} deleted` }
        };
        res.json(response);
    }
    catch (e) {
        throw new NotFoundError('Backup file not found');
    }
}));
// POST /api/databases/:dbName/restore - Restore from backup
router.post('/:dbName/restore', requireAuth, asyncHandler(async (req, res) => {
    const { dbName } = req.params;
    const { filename, clean = false } = req.body;
    if (!isSafeIdentifier(dbName)) {
        throw new ValidationError('Invalid database name');
    }
    if (!filename || !isValidFilename(filename)) {
        throw new ValidationError('Invalid filename');
    }
    const filepath = path.join(config.backupDir, filename);
    try {
        await fs.access(filepath);
    }
    catch (e) {
        throw new NotFoundError('Backup file not found');
    }
    let cmd;
    const connParams = `-h ${config.pg.host} -p ${config.pg.port} -U ${config.pg.user}`;
    if (filename.endsWith('.dump')) {
        // Custom format - use pg_restore
        cmd = `pg_restore ${connParams} -d ${dbName}`;
        if (clean)
            cmd += ' --clean';
        cmd += ` "${filepath}"`;
    }
    else if (filename.endsWith('.tar')) {
        // Tar format - use pg_restore
        cmd = `pg_restore ${connParams} -d ${dbName}`;
        if (clean)
            cmd += ' --clean';
        cmd += ` "${filepath}"`;
    }
    else if (filename.endsWith('.gz')) {
        // Gzipped SQL - decompress and pipe to psql
        cmd = `gunzip -c "${filepath}" | psql ${connParams} -d ${dbName}`;
    }
    else {
        // Plain SQL - use psql
        cmd = `psql ${connParams} -d ${dbName} < "${filepath}"`;
    }
    try {
        await execAsync(cmd, { shell: '/bin/bash', env: getPgEnv() });
        await logAudit({
            actor: req.user?.username || 'unknown',
            action: 'restore_backup',
            target: dbName,
            metadata: { filename, clean },
            ipAddress: req.ip
        });
        const response = {
            success: true,
            data: { message: `Database ${dbName} restored from ${filename}` }
        };
        res.json(response);
    }
    catch (err) {
        throw new ValidationError(`Restore failed: ${err.message}`);
    }
}));
export default router;
//# sourceMappingURL=backup.routes.js.map