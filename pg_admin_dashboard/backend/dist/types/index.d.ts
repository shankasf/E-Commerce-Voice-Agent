import type { Request } from 'express';
export interface User {
    id: string;
    username: string;
    email?: string;
    role: 'admin' | 'editor' | 'viewer';
}
export interface JwtPayload {
    userId: string;
    username: string;
    role: string;
    iat?: number;
    exp?: number;
}
export interface ApiKeyPayload {
    keyId: string;
    userId: string;
    permissions: string[];
}
export interface AuthenticatedRequest extends Request {
    user?: User;
    apiKey?: ApiKeyPayload;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta?: {
        page?: number;
        limit?: number;
        offset?: number;
        total?: number;
    };
}
export interface DatabaseInfo {
    datname: string;
    size_bytes: number;
    owner: string;
    datallowconn: boolean;
}
export interface TableInfo {
    table_schema: string;
    table_name: string;
}
export interface ColumnInfo {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
    character_maximum_length: number | null;
    is_primary: boolean;
}
export interface IndexInfo {
    indexname: string;
    indexdef: string;
    is_unique: boolean;
    index_type: string;
    columns: string;
}
export interface ConstraintInfo {
    constraint_name: string;
    constraint_type: string;
    definition: string;
}
export interface QueryResult {
    rows: Record<string, unknown>[];
    rowCount: number | null;
    fields: {
        name: string;
        dataTypeID: number;
    }[];
    command: string;
    duration: number;
}
export interface SchemaObject {
    schema_name: string;
    table_name?: string;
    column_name?: string;
    data_type?: string;
    not_null?: boolean;
    default_value?: string | null;
}
export interface FunctionInfo {
    schema_name: string;
    function_name: string;
    definition: string;
    arguments: string;
    return_type: string;
}
export interface TriggerInfo {
    trigger_name: string;
    schema_name: string;
    table_name: string;
    definition: string;
}
export interface ViewInfo {
    schema_name: string;
    view_name: string;
    definition: string;
}
export interface ExtensionInfo {
    extname: string;
    extversion: string;
}
export interface EnumInfo {
    schema_name: string;
    type_name: string;
    enum_values: string[];
}
export interface ForeignKeyInfo {
    constraint_name: string;
    schema_name: string;
    table_name: string;
    column_name: string;
    foreign_schema: string;
    foreign_table: string;
    foreign_column: string;
}
export interface BackupInfo {
    filename: string;
    database: string;
    size: number;
    created: string;
    format: 'plain' | 'custom' | 'tar';
}
export interface BackupOptions {
    format?: 'plain' | 'custom' | 'tar';
    schemaOnly?: boolean;
    dataOnly?: boolean;
    compress?: boolean;
}
export interface ServerStats {
    version: string;
    uptime: string;
    activeConnections: number;
    maxConnections: number;
    totalSize: number;
    databaseCount: number;
}
export interface ConnectionInfo {
    pid: number;
    datname: string;
    usename: string;
    client_addr: string;
    state: string;
    query: string;
    duration: string;
}
export interface DatabaseSizeInfo {
    datname: string;
    size_bytes: number;
    numbackends: number;
}
export interface LockInfo {
    pid: number;
    datname: string;
    relname: string;
    locktype: string;
    mode: string;
    granted: boolean;
}
export interface SlowQueryInfo {
    query: string;
    calls: number;
    total_time: number;
    mean_time: number;
    rows: number;
}
export interface ReplicationInfo {
    client_addr: string;
    state: string;
    sent_lsn: string;
    write_lsn: string;
    replay_lag: string;
}
export interface QueryHistoryEntry {
    id: string;
    database: string;
    sql: string;
    duration: number;
    rowCount: number | null;
    command: string;
    executedAt: string;
    userId: string;
}
//# sourceMappingURL=index.d.ts.map