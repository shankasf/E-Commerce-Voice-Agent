import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LogStreamService } from './log-stream.service';
interface LogSubscription {
    namespace: string;
    podName: string;
    container?: string;
}
interface NamespaceSubscription {
    namespace: string;
}
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private logStreamService;
    server: Server;
    private readonly logger;
    private clientSubscriptions;
    constructor(logStreamService: LogStreamService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleSubscribeLogs(client: Socket, data: LogSubscription): Promise<{
        success: boolean;
        streamId: string;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        streamId?: undefined;
    }>;
    handleUnsubscribeLogs(client: Socket, data: {
        streamId: string;
    }): {
        success: boolean;
    };
    handleSubscribeNamespace(client: Socket, data: NamespaceSubscription): {
        success: boolean;
    };
    handleUnsubscribeNamespace(client: Socket, data: NamespaceSubscription): {
        success: boolean;
    };
    broadcastPodStatus(namespace: string, podName: string, status: string, phase: string): void;
    broadcastDeploymentUpdate(namespace: string, deploymentName: string, replicas: number, readyReplicas: number): void;
    broadcastAlert(namespace: string, alert: {
        type: string;
        severity: string;
        message: string;
    }): void;
}
export {};
