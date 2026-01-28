import { WebSocketServer, WebSocket } from 'ws';
import { Client } from 'pg';
import { config } from '../config/index.js';
import { logger } from '../middleware/errorHandler.js';
export class RealtimeServer {
    wss;
    pgClient = null;
    subscriptions = new Map();
    channelSubscribers = new Map();
    constructor(httpServer) {
        this.wss = new WebSocketServer({ server: httpServer, path: '/realtime' });
        this.setupWebSocket();
    }
    async start() {
        try {
            // Dedicated connection for LISTEN
            this.pgClient = new Client(config.pg);
            await this.pgClient.connect();
            await this.pgClient.query('LISTEN pgadmin_changes');
            this.pgClient.on('notification', (msg) => {
                if (msg.channel === 'pgadmin_changes' && msg.payload) {
                    try {
                        const payload = JSON.parse(msg.payload);
                        this.handleNotification(payload);
                    }
                    catch (error) {
                        logger.error({ error }, 'Failed to parse notification payload');
                    }
                }
            });
            logger.info('Realtime server started');
        }
        catch (error) {
            logger.error({ error }, 'Failed to start realtime server');
        }
    }
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            logger.info('WebSocket client connected');
            const subscription = { ws, channels: new Set() };
            this.subscriptions.set(ws, subscription);
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(ws, message);
                }
                catch {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
                }
            });
            ws.on('close', () => {
                this.handleDisconnect(ws);
            });
            ws.on('error', (err) => {
                logger.error({ err }, 'WebSocket error');
            });
            // Send welcome message
            ws.send(JSON.stringify({ type: 'connected', message: 'Connected to realtime server' }));
        });
    }
    handleMessage(ws, message) {
        switch (message.type) {
            case 'subscribe':
                if (message.channel) {
                    this.subscribe(ws, message.channel);
                }
                break;
            case 'unsubscribe':
                if (message.channel) {
                    this.unsubscribe(ws, message.channel);
                }
                break;
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
        }
    }
    subscribe(ws, channel) {
        const subscription = this.subscriptions.get(ws);
        if (!subscription)
            return;
        subscription.channels.add(channel);
        if (!this.channelSubscribers.has(channel)) {
            this.channelSubscribers.set(channel, new Set());
        }
        this.channelSubscribers.get(channel).add(ws);
        ws.send(JSON.stringify({
            type: 'subscribed',
            channel,
            message: `Subscribed to ${channel}`,
        }));
        logger.info({ channel }, 'Client subscribed to channel');
    }
    unsubscribe(ws, channel) {
        const subscription = this.subscriptions.get(ws);
        if (!subscription)
            return;
        subscription.channels.delete(channel);
        this.channelSubscribers.get(channel)?.delete(ws);
        ws.send(JSON.stringify({
            type: 'unsubscribed',
            channel,
        }));
    }
    handleDisconnect(ws) {
        const subscription = this.subscriptions.get(ws);
        if (subscription) {
            for (const channel of subscription.channels) {
                this.channelSubscribers.get(channel)?.delete(ws);
            }
        }
        this.subscriptions.delete(ws);
        logger.info('WebSocket client disconnected');
    }
    handleNotification(payload) {
        const channel = payload.table; // schema.table format
        const subscribers = this.channelSubscribers.get(channel);
        if (subscribers && subscribers.size > 0) {
            const message = JSON.stringify({
                type: 'change',
                channel,
                ...payload,
            });
            for (const ws of subscribers) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(message);
                }
            }
            logger.info({ channel, operation: payload.operation, subscribers: subscribers.size }, 'Broadcasted change');
        }
    }
    async stop() {
        if (this.pgClient) {
            await this.pgClient.end();
        }
        this.wss.close();
    }
}
// SQL to create the notification trigger function
// Per PostgreSQL docs: https://www.postgresql.org/docs/current/sql-createfunction.html
// and https://www.postgresql.org/docs/current/sql-notify.html
export const REALTIME_FUNCTION_SQL = `
CREATE OR REPLACE FUNCTION _pgadmin.notify_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
BEGIN
    payload = jsonb_build_object(
        'table', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        'operation', TG_OP,
        'old', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
        'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        'timestamp', NOW()
    );

    -- NOTIFY with payload (max 8000 bytes per PostgreSQL docs)
    PERFORM pg_notify('pgadmin_changes', payload::text);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
`;
// SQL to enable realtime on a table
// Per PostgreSQL docs: https://www.postgresql.org/docs/current/sql-createtrigger.html
export function getEnableRealtimeSql(schema, table) {
    const triggerName = `pgadmin_realtime_${schema}_${table}`;
    return `
    CREATE OR REPLACE TRIGGER "${triggerName}"
    AFTER INSERT OR UPDATE OR DELETE ON "${schema}"."${table}"
    FOR EACH ROW
    EXECUTE FUNCTION _pgadmin.notify_changes();
  `;
}
export function getDisableRealtimeSql(schema, table) {
    const triggerName = `pgadmin_realtime_${schema}_${table}`;
    return `DROP TRIGGER IF EXISTS "${triggerName}" ON "${schema}"."${table}";`;
}
//# sourceMappingURL=server.js.map