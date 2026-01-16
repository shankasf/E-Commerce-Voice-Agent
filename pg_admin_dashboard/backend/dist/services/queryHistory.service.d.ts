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
export declare function saveQueryToHistory(entry: Omit<QueryHistoryEntry, 'id' | 'executedAt'>): Promise<QueryHistoryEntry>;
export declare function getQueryHistory(database: string, limit?: number, offset?: number): Promise<{
    entries: QueryHistoryEntry[];
    total: number;
}>;
export declare function clearQueryHistory(database: string): Promise<void>;
export declare function getQueryById(database: string, queryId: string): Promise<QueryHistoryEntry | null>;
export declare function deleteQueryFromHistory(database: string, queryId: string): Promise<boolean>;
//# sourceMappingURL=queryHistory.service.d.ts.map