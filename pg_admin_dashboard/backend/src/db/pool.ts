import pg from 'pg';
import type { PgConfig } from '../config/index.js';

const pools = new Map<string, pg.Pool>();

export function createAdminPool(pgConfig: PgConfig): pg.Pool {
  const pool = new pg.Pool(pgConfig);
  pools.set(pgConfig.database, pool);
  return pool;
}

export function getPoolForDb(pgConfig: PgConfig, database: string): pg.Pool {
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

export function getPool(database: string): pg.Pool | undefined {
  return pools.get(database);
}

export async function closePools(): Promise<void> {
  const closing: Promise<void>[] = [];
  for (const pool of pools.values()) {
    closing.push(pool.end());
  }
  await Promise.allSettled(closing);
}

export { pools };
