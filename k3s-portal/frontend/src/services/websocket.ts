import { io, Socket } from 'socket.io-client';
import type {
  WsLogLine,
  WsPodStatus,
  WsDeploymentUpdate,
  WsAlertTriggered,
  LogLine,
} from '../types';

type EventCallback<T> = (data: T) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<EventCallback<unknown>>> = new Map();

  connect(): void {
    if (this.socket?.connected) return;

    const token = localStorage.getItem('accessToken');
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;

    this.socket = io(`${wsUrl}/events`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[WS] Connected');
      this.reconnectAttempts = 0;
      this.emit('connection:status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      this.emit('connection:status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error);
      this.reconnectAttempts++;
      this.emit('connection:error', { error: error.message, attempts: this.reconnectAttempts });
    });

    // Log events
    this.socket.on('logs:line', (data: WsLogLine) => {
      this.emit('logs:line', data);
    });

    this.socket.on('logs:error', (data: { streamId: string; error: string }) => {
      this.emit('logs:error', data);
    });

    this.socket.on('logs:end', (data: { streamId: string }) => {
      this.emit('logs:end', data);
    });

    // Pod status events
    this.socket.on('pod:status', (data: WsPodStatus) => {
      this.emit('pod:status', data);
    });

    // Deployment events
    this.socket.on('deployment:update', (data: WsDeploymentUpdate) => {
      this.emit('deployment:update', data);
    });

    // Alert events
    this.socket.on('alert:triggered', (data: WsAlertTriggered) => {
      this.emit('alert:triggered', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Subscribe to log stream - returns streamId
  subscribeToLogs(
    namespace: string,
    podName: string,
    container: string | undefined,
    onLine: (line: LogLine) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ): string {
    const streamId = `${namespace}:${podName}:${container || 'all'}:${Date.now()}`;

    // Set up listeners
    const lineHandler = (data: WsLogLine) => {
      if (data.streamId === streamId || data.namespace === namespace && data.podName === podName) {
        onLine({
          streamId: data.streamId,
          namespace: data.namespace,
          podName: data.podName,
          line: data.line,
          timestamp: data.timestamp,
        });
      }
    };

    const errorHandler = (data: { streamId: string; error: string }) => {
      if (data.streamId === streamId) {
        onError(data.error);
      }
    };

    const endHandler = (data: { streamId: string }) => {
      if (data.streamId === streamId) {
        onEnd();
      }
    };

    this.on('logs:line', lineHandler);
    this.on('logs:error', errorHandler);
    this.on('logs:end', endHandler);

    // Send subscribe request
    if (this.socket?.connected) {
      this.socket.emit('subscribe:logs', {
        namespace,
        podName,
        container,
      });
    }

    return streamId;
  }

  unsubscribeFromLogs(streamId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:logs', { streamId });
    }
  }

  // Subscribe to namespace events (pod status, deployments)
  subscribeToNamespace(namespace: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:namespace', { namespace });
    }
  }

  unsubscribeFromNamespace(namespace: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:namespace', { namespace });
    }
  }

  // Subscribe to metrics updates
  subscribeToMetrics(namespace: string, interval = 15000): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:metrics', { namespace, interval });
    }
  }

  unsubscribeFromMetrics(namespace: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:metrics', { namespace });
    }
  }

  // Event listener management
  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
    };
  }

  off<T>(event: string, callback: EventCallback<T>): void {
    this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }
}

// Singleton instance
export const websocketService = new WebSocketService();

export default websocketService;
