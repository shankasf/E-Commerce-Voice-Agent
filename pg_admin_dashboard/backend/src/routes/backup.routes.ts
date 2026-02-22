import { Router } from 'express';
import type { Response } from 'express';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { config } from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { logAudit } from '../services/audit.service.js';
import { isSafeIdentifier } from '../utils/validators.js';
import type { AuthenticatedRequest, ApiResponse, BackupInfo } from '../types/index.js';

const router = Router();

// Execute command with arguments array (safe from shell injection)
function execCommand(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || `Command failed with exit code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

// Execute pg_dump with output to file (handles large outputs)
function execPgDump(args: string[], outputPath: string, env: NodeJS.ProcessEnv, compress: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('pg_dump', args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    const writeStream = createWriteStream(outputPath);

    if (compress) {
      const gzip = createGzip();
      pipeline(proc.stdout, gzip, writeStream)
        .then(() => {
          proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(stderr || `pg_dump failed with exit code ${code}`));
          });
        })
        .catch(reject);
    } else {
      pipeline(proc.stdout, writeStream)
        .then(() => {
          proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(stderr || `pg_dump failed with exit code ${code}`));
          });
        })
        .catch(reject);
    }

    proc.on('error', reject);
  });
}

// Build environment with PostgreSQL password for shell commands
function getPgEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PGPASSWORD: config.pg.password,
  };
}

// Ensure backup directory exists
async function ensureBackupDir(): Promise<void> {
  await fs.mkdir(config.backupDir, { recursive: true });
}

// Validate filename for path traversal attacks
function isValidFilename(filename: string): boolean {
  return !filename.includes('..') && !filename.includes('/') && !filename.includes('\\');
}

// GET /api/databases/backups - List all backups (all databases)
// NOTE: This route MUST come before /:dbName/backups to avoid matching "backups" as dbName
router.get(
  '/backups',
  requireAuth,
  asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    await ensureBackupDir();

    const backups: BackupInfo[] = [];
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
    } catch (e) {
      // Directory might not exist yet
    }

    const response: ApiResponse<BackupInfo[]> = {
      success: true,
      data: backups
    };
    res.json(response);
  })
);

// GET /api/databases/:dbName/backups - List backups for specific database
router.get(
  '/:dbName/backups',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    await ensureBackupDir();

    const backups: BackupInfo[] = [];
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
    } catch (e) {
      // Directory might not exist yet
    }

    const response: ApiResponse<BackupInfo[]> = {
      success: true,
      data: backups
    };
    res.json(response);
  })
);

// POST /api/databases/:dbName/backup - Create backup
// PostgreSQL 18.1 pg_dump enhancements:
// - --statistics: Dump optimizer statistics
// - --sequence-data: Include sequence data
// - --no-statistics: Skip statistics
// Reference: https://www.postgresql.org/docs/current/app-pgdump.html
// SECURITY: Uses spawn with argument array to prevent shell injection
router.post(
  '/:dbName/backup',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;
    const {
      format = 'plain',
      schemaOnly = false,
      dataOnly = false,
      compress = false,
      // PostgreSQL 18.1 new options
      includeStatistics = false,
      includeSequenceData = true, // Default true for backward compatibility
      noPolicies = false
    } = req.body;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    await ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    let ext = format === 'custom' ? 'dump' : format === 'tar' ? 'tar' : 'sql';
    if (compress && ext === 'sql') ext = 'sql.gz';
    const filename = `${dbName}_${timestamp}.${ext}`;
    const filepath = path.join(config.backupDir, filename);

    // Build arguments array (safe from shell injection)
    const args: string[] = [
      '-h', config.pg.host,
      '-p', String(config.pg.port),
      '-U', config.pg.user
    ];

    if (format === 'custom') args.push('-Fc');
    else if (format === 'tar') args.push('-Ft');
    else args.push('-Fp');

    if (schemaOnly) args.push('--schema-only');
    if (dataOnly) args.push('--data-only');

    // PostgreSQL 18.1 new options
    if (includeStatistics) args.push('--statistics');
    if (includeSequenceData && !schemaOnly) args.push('--sequence-data');
    if (noPolicies) args.push('--no-policies');

    args.push(dbName);

    try {
      await execPgDump(args, filepath, getPgEnv(), compress && format === 'plain');

      await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'create_backup',
        target: dbName,
        metadata: { filename, format, schemaOnly, dataOnly, compress, includeStatistics, includeSequenceData, noPolicies },
        ipAddress: req.ip
      });

      const stat = await fs.stat(filepath);
      const backup: BackupInfo = {
        filename,
        database: dbName,
        size: stat.size,
        created: stat.mtime.toISOString(),
        format: format as 'plain' | 'custom' | 'tar'
      };

      const response: ApiResponse<BackupInfo> = {
        success: true,
        data: backup
      };
      res.status(201).json(response);
    } catch (err) {
      // Clean up partial file on failure
      try { await fs.unlink(filepath); } catch { /* ignore */ }
      throw new ValidationError(`Backup failed: ${(err as Error).message}`);
    }
  })
);

// GET /api/databases/:dbName/backups/:filename/download - Download backup
router.get(
  '/:dbName/backups/:filename/download',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { filename } = req.params;

    if (!isValidFilename(filename)) {
      throw new ValidationError('Invalid filename');
    }

    const filepath = path.join(config.backupDir, filename);

    try {
      await fs.access(filepath);
      res.download(filepath);
    } catch (e) {
      throw new NotFoundError('Backup file not found');
    }
  })
);

// DELETE /api/databases/:dbName/backups/:filename - Delete backup
router.delete(
  '/:dbName/backups/:filename',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

      const response: ApiResponse = {
        success: true,
        data: { message: `Backup ${filename} deleted` }
      };
      res.json(response);
    } catch (e) {
      throw new NotFoundError('Backup file not found');
    }
  })
);

// POST /api/databases/:dbName/restore - Restore from backup
// PostgreSQL 18.1 pg_restore enhancements:
// - --statistics-only: Restore only optimizer statistics
// - --no-statistics: Skip restoring statistics
// - --no-policies: Skip row-level security policies
// Reference: https://www.postgresql.org/docs/current/app-pgrestore.html
// SECURITY: Uses spawn with argument array to prevent shell injection
router.post(
  '/:dbName/restore',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { dbName } = req.params;
    const {
      filename,
      clean = false,
      // PostgreSQL 18.1 new options
      statisticsOnly = false,
      noStatistics = false,
      noPolicies = false,
      jobs = 1 // Parallel jobs for pg_restore
    } = req.body;

    if (!isSafeIdentifier(dbName)) {
      throw new ValidationError('Invalid database name');
    }

    if (!filename || !isValidFilename(filename)) {
      throw new ValidationError('Invalid filename');
    }

    const filepath = path.join(config.backupDir, filename);

    try {
      await fs.access(filepath);
    } catch (e) {
      throw new NotFoundError('Backup file not found');
    }

    const env = getPgEnv();

    try {
      if (filename.endsWith('.dump') || filename.endsWith('.tar')) {
        // Custom/tar format - use pg_restore with argument array
        const args: string[] = [
          '-h', config.pg.host,
          '-p', String(config.pg.port),
          '-U', config.pg.user,
          '-d', dbName
        ];
        if (clean) args.push('--clean');
        // PostgreSQL 18.1 new options
        if (statisticsOnly) args.push('--statistics-only');
        if (noStatistics) args.push('--no-statistics');
        if (noPolicies) args.push('--no-policies');
        if (jobs > 1) args.push(`--jobs=${Math.min(jobs, 8)}`);
        args.push(filepath);

        await execCommand('pg_restore', args, env);
      } else if (filename.endsWith('.gz')) {
        // Gzipped SQL - use gunzip and pipe to psql
        await execRestoreGzip(filepath, dbName, env);
      } else {
        // Plain SQL - use psql with -f flag
        const args: string[] = [
          '-h', config.pg.host,
          '-p', String(config.pg.port),
          '-U', config.pg.user,
          '-d', dbName,
          '-f', filepath
        ];
        await execCommand('psql', args, env);
      }

      await logAudit({
        actor: req.user?.username || 'unknown',
        action: 'restore_backup',
        target: dbName,
        metadata: { filename, clean, statisticsOnly, noStatistics, noPolicies, jobs },
        ipAddress: req.ip
      });

      const response: ApiResponse = {
        success: true,
        data: { message: `Database ${dbName} restored from ${filename}` }
      };
      res.json(response);
    } catch (err) {
      throw new ValidationError(`Restore failed: ${(err as Error).message}`);
    }
  })
);

// Execute gzip restore (gunzip | psql) safely
function execRestoreGzip(filepath: string, dbName: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const gunzip = spawn('gunzip', ['-c', filepath], { env, stdio: ['pipe', 'pipe', 'pipe'] });
    const psql = spawn('psql', [
      '-h', config.pg.host,
      '-p', String(config.pg.port),
      '-U', config.pg.user,
      '-d', dbName
    ], { env, stdio: ['pipe', 'pipe', 'pipe'] });

    let stderr = '';
    gunzip.stderr.on('data', (data) => { stderr += data.toString(); });
    psql.stderr.on('data', (data) => { stderr += data.toString(); });

    // Pipe gunzip output to psql input
    gunzip.stdout.pipe(psql.stdin);

    psql.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `Restore failed with exit code ${code}`));
    });

    gunzip.on('error', reject);
    psql.on('error', reject);
  });
}

export default router;
