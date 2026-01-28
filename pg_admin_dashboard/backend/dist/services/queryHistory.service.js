import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
const HISTORY_DIR = process.env.QUERY_HISTORY_DIR || '/data/query-history';
const MAX_ENTRIES_PER_DB = 100;
async function ensureHistoryDir() {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
}
function getHistoryFilePath(database) {
    // Sanitize database name for filename
    const safeName = database.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(HISTORY_DIR, `${safeName}.json`);
}
export async function saveQueryToHistory(entry) {
    await ensureHistoryDir();
    const fullEntry = {
        ...entry,
        id: crypto.randomUUID(),
        executedAt: new Date().toISOString()
    };
    const filepath = getHistoryFilePath(entry.database);
    let history = [];
    try {
        const content = await fs.readFile(filepath, 'utf-8');
        history = JSON.parse(content);
    }
    catch (e) {
        // File doesn't exist yet
    }
    // Add new entry at the beginning
    history.unshift(fullEntry);
    // Keep only the most recent entries
    if (history.length > MAX_ENTRIES_PER_DB) {
        history = history.slice(0, MAX_ENTRIES_PER_DB);
    }
    await fs.writeFile(filepath, JSON.stringify(history, null, 2));
    return fullEntry;
}
export async function getQueryHistory(database, limit = 50, offset = 0) {
    await ensureHistoryDir();
    const filepath = getHistoryFilePath(database);
    let history = [];
    try {
        const content = await fs.readFile(filepath, 'utf-8');
        history = JSON.parse(content);
    }
    catch (e) {
        // File doesn't exist yet
    }
    const total = history.length;
    const entries = history.slice(offset, offset + limit);
    return { entries, total };
}
export async function clearQueryHistory(database) {
    await ensureHistoryDir();
    const filepath = getHistoryFilePath(database);
    try {
        await fs.unlink(filepath);
    }
    catch (e) {
        // File might not exist
    }
}
export async function getQueryById(database, queryId) {
    await ensureHistoryDir();
    const filepath = getHistoryFilePath(database);
    try {
        const content = await fs.readFile(filepath, 'utf-8');
        const history = JSON.parse(content);
        return history.find(e => e.id === queryId) || null;
    }
    catch (e) {
        return null;
    }
}
export async function deleteQueryFromHistory(database, queryId) {
    await ensureHistoryDir();
    const filepath = getHistoryFilePath(database);
    try {
        const content = await fs.readFile(filepath, 'utf-8');
        let history = JSON.parse(content);
        const initialLength = history.length;
        history = history.filter(e => e.id !== queryId);
        if (history.length < initialLength) {
            await fs.writeFile(filepath, JSON.stringify(history, null, 2));
            return true;
        }
        return false;
    }
    catch (e) {
        return false;
    }
}
//# sourceMappingURL=queryHistory.service.js.map