// Polling-based realtime replacement
// Replaces Supabase WebSocket subscriptions with periodic HTTP polling

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  table: string;
  event?: RealtimeEvent;
  filter?: string;
  onData: (payload: any) => void;
}

// Connection state management
let isConnected = false;
const intervals: Map<string, NodeJS.Timeout> = new Map();

const POLL_INTERVAL_MS = 5000; // 5 seconds

export function getRealtimeStatus(): boolean {
  return isConnected;
}

// Subscribe to a table via polling
export function subscribeToTable(config: SubscriptionConfig): () => void {
  const { table, onData } = config;
  const channelName = `${table}-${Math.random().toString(36).substring(7)}`;

  console.log(`[Realtime] Polling ${table} every ${POLL_INTERVAL_MS}ms`);
  isConnected = true;

  // Set up polling interval
  const interval = setInterval(async () => {
    try {
      // Trigger a data refresh callback
      onData({ eventType: 'POLL', table });
    } catch (error) {
      console.error(`[Realtime] Polling error for ${table}:`, error);
    }
  }, POLL_INTERVAL_MS);

  intervals.set(channelName, interval);

  return () => {
    console.log(`[Realtime] Stopping poll for ${channelName}`);
    clearInterval(interval);
    intervals.delete(channelName);
    if (intervals.size === 0) isConnected = false;
  };
}

// Subscribe to multiple tables
export function subscribeToMultiple(configs: SubscriptionConfig[]): () => void {
  const cleanups = configs.map(config => subscribeToTable(config));
  return () => cleanups.forEach(cleanup => cleanup());
}

// Broadcast not supported in polling mode
export function broadcastMessage(_channelName: string, _event: string, _payload: any): void {
  // No-op in polling mode
}

export function getActiveChannels(): string[] {
  return Array.from(intervals.keys());
}

export function cleanupAllChannels(): void {
  intervals.forEach((interval, name) => {
    console.log(`[Realtime] Cleaning up poll ${name}`);
    clearInterval(interval);
  });
  intervals.clear();
  isConnected = false;
}
