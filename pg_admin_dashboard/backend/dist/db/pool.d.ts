import pg from 'pg';
import type { PgConfig } from '../config/index.js';
declare const pools: Map<string, import("pg").Pool>;
export declare function createAdminPool(pgConfig: PgConfig): pg.Pool;
export declare function getPoolForDb(pgConfig: PgConfig, database: string): pg.Pool;
export declare function getPool(database: string): pg.Pool | undefined;
export declare function closePools(): Promise<void>;
export { pools };
//# sourceMappingURL=pool.d.ts.map