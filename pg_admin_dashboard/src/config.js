import crypto from 'crypto';

const numberOr = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export const config = {
  env: process.env.NODE_ENV || 'production',
  port: numberOr(process.env.PORT, 3000),
  sessionSecret,
  adminId: process.env.ADMIN_ID || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'ChangeMe-Now-123!',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
  allowDbDrop: process.env.ALLOW_DB_DROP === 'true',
  allowSuperuserGrant: process.env.ALLOW_SUPERUSER_GRANT === 'true',
  trustProxy: process.env.TRUST_PROXY === 'true',
  auditLogPath: process.env.AUDIT_LOG_PATH || '/data/audit.log',
  sessionDir: process.env.SESSION_DIR || '/data/sessions',
  pg: {
    host: process.env.PGHOST || 'localhost',
    port: numberOr(process.env.PGPORT, 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'postgres',
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
  }
};
