import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';
async function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
}
export async function logAudit(entry) {
    const payload = {
        ...entry,
        ts: new Date().toISOString()
    };
    try {
        await ensureDir(config.auditLogPath);
        await fs.appendFile(config.auditLogPath, `${JSON.stringify(payload)}\n`, { encoding: 'utf8' });
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
    }
}
export async function getAuditLogs(limit = 100, offset = 0) {
    try {
        const content = await fs.readFile(config.auditLogPath, 'utf8');
        const lines = content.trim().split('\n').filter(Boolean);
        const logs = lines.map(line => JSON.parse(line));
        return logs.reverse().slice(offset, offset + limit);
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=audit.service.js.map