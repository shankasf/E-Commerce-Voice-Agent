import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

export interface AuditEntry {
  actor: string;
  action: string;
  target?: string;
  database?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLog extends AuditEntry {
  ts: string;
}

async function ensureDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  const payload: AuditLog = {
    ...entry,
    ts: new Date().toISOString()
  };

  try {
    await ensureDir(config.auditLogPath);
    await fs.appendFile(config.auditLogPath, `${JSON.stringify(payload)}\n`, { encoding: 'utf8' });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function getAuditLogs(limit = 100, offset = 0): Promise<AuditLog[]> {
  try {
    const content = await fs.readFile(config.auditLogPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    const logs = lines.map(line => JSON.parse(line) as AuditLog);
    return logs.reverse().slice(offset, offset + limit);
  } catch {
    return [];
  }
}
