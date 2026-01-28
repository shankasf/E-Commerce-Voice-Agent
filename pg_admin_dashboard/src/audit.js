import fs from 'fs/promises';
import path from 'path';

export async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

export async function logAudit(filePath, entry) {
  const payload = {
    ...entry,
    ts: new Date().toISOString()
  };
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, { encoding: 'utf8' });
}
