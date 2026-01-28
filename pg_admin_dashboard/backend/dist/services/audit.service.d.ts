export interface AuditEntry {
    actor: string;
    action: string;
    target?: string;
    database?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}
interface AuditLog extends AuditEntry {
    ts: string;
}
export declare function logAudit(entry: AuditEntry): Promise<void>;
export declare function getAuditLogs(limit?: number, offset?: number): Promise<AuditLog[]>;
export {};
//# sourceMappingURL=audit.service.d.ts.map