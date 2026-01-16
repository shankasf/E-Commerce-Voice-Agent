export interface PgConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    ssl: {
        rejectUnauthorized: boolean;
    } | false;
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
export declare const config: Config;
//# sourceMappingURL=index.d.ts.map