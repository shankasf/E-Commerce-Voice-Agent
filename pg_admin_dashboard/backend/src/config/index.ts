import crypto from 'crypto';

const numberOr = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

export interface PgConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: { rejectUnauthorized: boolean } | false;
}

export interface Config {
  env: string;
  port: number;
  sessionSecret: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  adminId: string;
  adminPassword: string;
  adminPasswordHash: string;
  allowDbDrop: boolean;
  allowSuperuserGrant: boolean;
  trustProxy: boolean;
  auditLogPath: string;
  sessionDir: string;
  backupDir: string;
  corsOrigin: string;
  pg: PgConfig;
}

export const config: Config = {
  env: process.env.NODE_ENV || 'production',
  port: numberOr(process.env.PORT, 3001),
  sessionSecret,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  adminId: process.env.ADMIN_ID || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'ChangeMe-Now-123!',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
  allowDbDrop: process.env.ALLOW_DB_DROP === 'true',
  allowSuperuserGrant: process.env.ALLOW_SUPERUSER_GRANT === 'true',
  trustProxy: process.env.TRUST_PROXY === 'true',
  auditLogPath: process.env.AUDIT_LOG_PATH || '/data/audit.log',
  sessionDir: process.env.SESSION_DIR || '/data/sessions',
  backupDir: process.env.BACKUP_DIR || '/data/backups',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  pg: {
    host: process.env.PGHOST || 'localhost',
    port: numberOr(process.env.PGPORT, 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'postgres',
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
  }
};
