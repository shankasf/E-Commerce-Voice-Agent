'use client';

import { useEffect, useRef, useCallback } from 'react';
import { subscribeToTable, cleanupAllChannels, getRealtimeStatus, RealtimeEvent } from './realtime';

interface UseRealtimeOptions {
  table: string;
  event?: RealtimeEvent;
  filter?: string;
  enabled?: boolean;
}

// Hook for subscribing to a single table
export function useRealtime(
  options: UseRealtimeOptions,
  onData: (payload: any) => void,
  deps: any[] = []
) {
  const { table, event = '*', filter, enabled = true } = options;
  const callbackRef = useRef(onData);
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onData;
  }, [onData]);

  useEffect(() => {
    if (!enabled) return;

    const cleanup = subscribeToTable({
      table,
      event,
      filter,
      onData: (payload) => callbackRef.current(payload),
    });

    return cleanup;
  }, [table, event, filter, enabled, ...deps]);
}

// Hook for subscribing to ticket changes
export function useTicketRealtime(
  ticketId: number | undefined,
  onTicketChange: () => void,
  onMessageChange: () => void
) {
  const ticketRef = useRef(onTicketChange);
  const messageRef = useRef(onMessageChange);

  useEffect(() => {
    ticketRef.current = onTicketChange;
    messageRef.current = onMessageChange;
  }, [onTicketChange, onMessageChange]);

  // Subscribe to ticket updates
  useRealtime(
    {
      table: 'support_tickets',
      filter: ticketId ? `ticket_id=eq.${ticketId}` : undefined,
      enabled: !!ticketId,
    },
    () => ticketRef.current(),
    [ticketId]
  );

  // Subscribe to message updates
  useRealtime(
    {
      table: 'ticket_messages',
      filter: ticketId ? `ticket_id=eq.${ticketId}` : undefined,
      enabled: !!ticketId,
    },
    () => messageRef.current(),
    [ticketId]
  );
}

// Hook for subscribing to all tickets (for agents/admins)
export function useAllTicketsRealtime(onUpdate: () => void) {
  const callbackRef = useRef(onUpdate);

  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useRealtime(
    { table: 'support_tickets' },
    () => callbackRef.current(),
    []
  );

  useRealtime(
    { table: 'ticket_assignments' },
    () => callbackRef.current(),
    []
  );
}

// Hook for requester's tickets
export function useRequesterTicketsRealtime(contactId: number | undefined, onUpdate: () => void) {
  const callbackRef = useRef(onUpdate);

  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useRealtime(
    {
      table: 'support_tickets',
      filter: contactId ? `contact_id=eq.${contactId}` : undefined,
      enabled: !!contactId,
    },
    () => callbackRef.current(),
    [contactId]
  );
}

// Check if realtime is connected
export function useRealtimeStatus() {
  return getRealtimeStatus();
}

// Cleanup hook for component unmount
export function useRealtimeCleanup() {
  useEffect(() => {
    return () => {
      cleanupAllChannels();
    };
  }, []);
}
