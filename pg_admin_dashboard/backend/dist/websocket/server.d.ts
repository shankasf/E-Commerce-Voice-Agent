import type { Server } from 'http';
export declare class RealtimeServer {
    private wss;
    private pgClient;
    private subscriptions;
    private channelSubscribers;
    constructor(httpServer: Server);
    start(): Promise<void>;
    private setupWebSocket;
    private handleMessage;
    private subscribe;
    private unsubscribe;
    private handleDisconnect;
    private handleNotification;
    stop(): Promise<void>;
}
export declare const REALTIME_FUNCTION_SQL = "\nCREATE OR REPLACE FUNCTION _pgadmin.notify_changes()\nRETURNS TRIGGER AS $$\nDECLARE\n    payload JSONB;\nBEGIN\n    payload = jsonb_build_object(\n        'table', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,\n        'operation', TG_OP,\n        'old', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,\n        'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,\n        'timestamp', NOW()\n    );\n\n    -- NOTIFY with payload (max 8000 bytes per PostgreSQL docs)\n    PERFORM pg_notify('pgadmin_changes', payload::text);\n\n    RETURN COALESCE(NEW, OLD);\nEND;\n$$ LANGUAGE plpgsql;\n";
export declare function getEnableRealtimeSql(schema: string, table: string): string;
export declare function getDisableRealtimeSql(schema: string, table: string): string;
//# sourceMappingURL=server.d.ts.map