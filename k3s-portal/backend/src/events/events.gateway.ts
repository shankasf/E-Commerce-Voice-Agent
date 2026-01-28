import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
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

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private clientSubscriptions: Map<string, Set<string>> = new Map();

  constructor(private logStreamService: LogStreamService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.clientSubscriptions.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Clean up subscriptions
    const subscriptions = this.clientSubscriptions.get(client.id);
    if (subscriptions) {
      for (const streamId of subscriptions) {
        this.logStreamService.stopStream(streamId);
      }
    }
    this.clientSubscriptions.delete(client.id);
  }

  @SubscribeMessage('subscribe:logs')
  async handleSubscribeLogs(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LogSubscription,
  ) {
    const { namespace, podName, container } = data;
    this.logger.log(`Client ${client.id} subscribing to logs: ${namespace}/${podName}`);

    const streamId = `${client.id}-${namespace}-${podName}-${container || 'default'}`;

    // Track subscription
    const subscriptions = this.clientSubscriptions.get(client.id);
    if (subscriptions) {
      subscriptions.add(streamId);
    }

    // Start log stream
    try {
      await this.logStreamService.startStream({
        streamId,
        namespace,
        podName,
        container,
        onLine: (line: string) => {
          client.emit('logs:line', {
            streamId,
            namespace,
            podName,
            line,
            timestamp: new Date().toISOString(),
          });
        },
        onError: (error: string) => {
          client.emit('logs:error', {
            streamId,
            namespace,
            podName,
            error,
          });
        },
        onEnd: () => {
          client.emit('logs:end', { streamId, namespace, podName });
        },
      });

      return { success: true, streamId };
    } catch (error) {
      this.logger.error(`Failed to start log stream: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  @SubscribeMessage('unsubscribe:logs')
  handleUnsubscribeLogs(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { streamId: string },
  ) {
    const { streamId } = data;
    this.logger.log(`Client ${client.id} unsubscribing from logs: ${streamId}`);

    this.logStreamService.stopStream(streamId);

    const subscriptions = this.clientSubscriptions.get(client.id);
    if (subscriptions) {
      subscriptions.delete(streamId);
    }

    return { success: true };
  }

  @SubscribeMessage('subscribe:namespace')
  handleSubscribeNamespace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: NamespaceSubscription,
  ) {
    const { namespace } = data;
    this.logger.log(`Client ${client.id} subscribing to namespace: ${namespace}`);

    client.join(`namespace:${namespace}`);
    return { success: true };
  }

  @SubscribeMessage('unsubscribe:namespace')
  handleUnsubscribeNamespace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: NamespaceSubscription,
  ) {
    const { namespace } = data;
    this.logger.log(`Client ${client.id} unsubscribing from namespace: ${namespace}`);

    client.leave(`namespace:${namespace}`);
    return { success: true };
  }

  // Broadcast methods for external use
  broadcastPodStatus(namespace: string, podName: string, status: string, phase: string) {
    this.server.to(`namespace:${namespace}`).emit('pod:status', {
      namespace,
      podName,
      status,
      phase,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastDeploymentUpdate(namespace: string, deploymentName: string, replicas: number, readyReplicas: number) {
    this.server.to(`namespace:${namespace}`).emit('deployment:update', {
      namespace,
      deploymentName,
      replicas,
      readyReplicas,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastAlert(namespace: string, alert: { type: string; severity: string; message: string }) {
    this.server.to(`namespace:${namespace}`).emit('alert:triggered', {
      namespace,
      ...alert,
      timestamp: new Date().toISOString(),
    });
  }
}
