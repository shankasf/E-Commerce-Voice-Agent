import pg from 'pg';

const pools = new Map();

export function createAdminPool(pgConfig) {
  const pool = new pg.Pool(pgConfig);
  pools.set(pgConfig.database, pool);
  return pool;
}

export function getPoolForDb(pgConfig, database) {
  if (pools.has(database)) {
    return pools.get(database);
  }
  const pool = new pg.Pool({
    ...pgConfig,
    database
  });
  pools.set(database, pool);
  return pool;
}

export async function closePools() {
  const closing = [];
  for (const pool of pools.values()) {
    closing.push(pool.end());
  }
  await Promise.allSettled(closing);
}
