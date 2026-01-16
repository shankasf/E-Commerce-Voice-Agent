import pg from 'pg';
const pools = new Map();
export function createAdminPool(pgConfig) {
    const pool = new pg.Pool(pgConfig);
    pools.set(pgConfig.database, pool);
    return pool;
}
export function getPoolForDb(pgConfig, database) {
    const existing = pools.get(database);
    if (existing) {
        return existing;
    }
    const pool = new pg.Pool({
        ...pgConfig,
        database
    });
    pools.set(database, pool);
    return pool;
}
export function getPool(database) {
    return pools.get(database);
}
export async function closePools() {
    const closing = [];
    for (const pool of pools.values()) {
        closing.push(pool.end());
    }
    await Promise.allSettled(closing);
}
export { pools };
//# sourceMappingURL=pool.js.map