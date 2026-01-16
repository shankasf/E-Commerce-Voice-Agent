import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: 'connected' | 'subscribed' | 'unsubscribed' | 'change' | 'pong' | 'error';
  channel?: string;
  message?: string;
  operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
  timestamp?: string;
}

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/realtime`;

export function useWebSocket(channel?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setIsConnected(true);

        // Subscribe to channel if provided
        if (channel) {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        }

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Handle change notifications
          if (message.type === 'change' && message.channel) {
            // Parse channel to get schema.table
            const [schema, table] = message.channel.split('.');
            if (schema && table) {
              // Invalidate React Query cache for this table
              queryClient.invalidateQueries({ queryKey: ['table', undefined, schema, table] });
            }
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('Failed to create WebSocket connection:', e);
    }
  }, [channel, queryClient]);

  const subscribe = useCallback((newChannel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', channel: newChannel }));
    }
  }, []);

  const unsubscribe = useCallback((channelToUnsubscribe: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel: channelToUnsubscribe }));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Subscribe to channel when it changes
  useEffect(() => {
    if (channel && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  }, [channel]);

  return {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
  };
}
