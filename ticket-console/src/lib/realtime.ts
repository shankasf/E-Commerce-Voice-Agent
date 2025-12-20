import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Types for realtime events
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  table: string;
  event?: RealtimeEvent;
  filter?: string;
  onData: (payload: any) => void;
}

// Connection state management
let isConnected = false;
const channels: Map<string, RealtimeChannel> = new Map();

// Check and log realtime connection status
export function getRealtimeStatus(): boolean {
  return isConnected;
}

// Create a unique channel name
function createChannelName(table: string, filter?: string): string {
  const suffix = Math.random().toString(36).substring(7);
  return filter ? `${table}-${filter}-${suffix}` : `${table}-${suffix}`;
}

// Subscribe to a table with WebSocket connection (following Supabase docs pattern)
export function subscribeToTable(config: SubscriptionConfig): () => void {
  const { table, event = '*', filter, onData } = config;
  const channelName = createChannelName(table, filter);

  console.log(`[Realtime] Subscribing to ${table}${filter ? ` with filter ${filter}` : ''}`);

  // Create channel following exact Supabase documentation pattern
  // Using type assertion because TypeScript types may not match runtime behavior
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as const,
      {
        event: event,
        schema: 'public',
        table: table,
        ...(filter ? { filter } : {}),
      } as any,
      (payload: any) => {
        console.log(`[Realtime] Event received on ${table}:`, payload.eventType, payload);
        onData(payload);
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] Channel ${channelName} status:`, status);
      if (status === 'SUBSCRIBED') {
        isConnected = true;
        console.log(`[Realtime] ✓ Successfully subscribed to ${channelName}`);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        isConnected = false;
        console.error(`[Realtime] ✗ Channel ${channelName} closed or error`);
      } else if (status === 'TIMED_OUT') {
        console.error(`[Realtime] ✗ Channel ${channelName} timed out`);
      }
    });

  channels.set(channelName, channel);

  // Return cleanup function
  return () => {
    console.log(`[Realtime] Unsubscribing from ${channelName}`);
    supabase.removeChannel(channel);
    channels.delete(channelName);
  };
}

// Subscribe to multiple tables
export function subscribeToMultiple(configs: SubscriptionConfig[]): () => void {
  const cleanups = configs.map(config => subscribeToTable(config));
  
  return () => {
    cleanups.forEach(cleanup => cleanup());
  };
}

// Broadcast a message to a channel (for custom events)
export function broadcastMessage(channelName: string, event: string, payload: any): void {
  const channel = channels.get(channelName);
  if (channel) {
    channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }
}

// Get all active channels
export function getActiveChannels(): string[] {
  return Array.from(channels.keys());
}

// Cleanup all channels
export function cleanupAllChannels(): void {
  channels.forEach((channel, name) => {
    console.log(`[Realtime] Cleaning up channel ${name}`);
    supabase.removeChannel(channel);
  });
  channels.clear();
  isConnected = false;
}
