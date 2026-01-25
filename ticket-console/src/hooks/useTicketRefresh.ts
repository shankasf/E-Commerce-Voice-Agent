'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAllTicketsRealtime, useRequesterTicketsRealtime } from '@/lib/useRealtime';

interface UseTicketRefreshOptions {
  /**
   * Polling interval in milliseconds (default: 10000)
   */
  pollingInterval?: number;
  /**
   * Whether to enable real-time and polling (default: true)
   */
  enabled?: boolean;
}

/**
 * Combined hook for real-time subscription + polling fallback
 * Use this for admin/agent dashboards that need to track all tickets
 */
export function useTicketRefresh(
  onRefresh: () => void,
  options: UseTicketRefreshOptions = {}
) {
  const { pollingInterval = 10000, enabled = true } = options;
  const callbackRef = useRef(onRefresh);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  const refresh = useCallback(() => {
    callbackRef.current();
  }, []);

  // Real-time WebSocket subscription
  useAllTicketsRealtime(refresh);

  // Polling fallback
  useEffect(() => {
    if (!enabled) return;

    const pollInterval = setInterval(() => {
      callbackRef.current();
    }, pollingInterval);

    return () => clearInterval(pollInterval);
  }, [pollingInterval, enabled]);
}

/**
 * Combined hook for requester-specific ticket refresh
 * Filters tickets by contact ID
 */
export function useRequesterRefresh(
  contactId: number | undefined,
  onRefresh: () => void,
  options: UseTicketRefreshOptions = {}
) {
  const { pollingInterval = 10000, enabled = true } = options;
  const callbackRef = useRef(onRefresh);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onRefresh;
  }, [onRefresh]);

  const refresh = useCallback(() => {
    callbackRef.current();
  }, []);

  // Real-time WebSocket subscription for requester's tickets
  useRequesterTicketsRealtime(contactId, refresh);

  // Polling fallback
  useEffect(() => {
    if (!enabled || !contactId) return;

    const pollInterval = setInterval(() => {
      callbackRef.current();
    }, pollingInterval);

    return () => clearInterval(pollInterval);
  }, [contactId, pollingInterval, enabled]);
}
