import { useCallback, useEffect, useRef } from 'react'
import { EventPayload, logEvents } from '../lib/api'

const BATCH_SIZE = 10
const BATCH_INTERVAL = 2000 // 2 seconds

interface UseEventLoggerOptions {
  attemptId: string | null
  enabled: boolean
}

export function useEventLogger({ attemptId, enabled }: UseEventLoggerOptions) {
  const eventQueue = useRef<EventPayload[]>([])
  const localStorageKey = attemptId ? `quiz_events_${attemptId}` : null

  // Load events from localStorage on mount
  useEffect(() => {
    if (!localStorageKey) return

    const stored = localStorage.getItem(localStorageKey)
    if (stored) {
      try {
        const events = JSON.parse(stored) as EventPayload[]
        eventQueue.current = events
      } catch (e) {
        // Invalid stored data, ignore
      }
    }
  }, [localStorageKey])

  // Save events to localStorage
  const saveToLocalStorage = useCallback(() => {
    if (!localStorageKey) return
    if (eventQueue.current.length > 0) {
      localStorage.setItem(localStorageKey, JSON.stringify(eventQueue.current))
    } else {
      localStorage.removeItem(localStorageKey)
    }
  }, [localStorageKey])

  // Flush events to server
  const flushEvents = useCallback(async () => {
    if (!attemptId || eventQueue.current.length === 0) return

    const eventsToSend = [...eventQueue.current]
    eventQueue.current = []

    try {
      await logEvents(attemptId, eventsToSend)
      saveToLocalStorage()
    } catch (error) {
      // Re-queue events on failure
      eventQueue.current = [...eventsToSend, ...eventQueue.current]
      saveToLocalStorage()
      console.error('Failed to log events:', error)
    }
  }, [attemptId, saveToLocalStorage])

  // Add event to queue
  const addEvent = useCallback((event: EventPayload) => {
    eventQueue.current.push(event)
    saveToLocalStorage()

    // Flush if queue is full
    if (eventQueue.current.length >= BATCH_SIZE) {
      flushEvents()
    }
  }, [saveToLocalStorage, flushEvents])

  // Periodic flush
  useEffect(() => {
    if (!enabled || !attemptId) return

    const interval = setInterval(flushEvents, BATCH_INTERVAL)

    // Flush on unmount
    return () => {
      clearInterval(interval)
      flushEvents()
    }
  }, [enabled, attemptId, flushEvents])

  // Flush on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (attemptId && eventQueue.current.length > 0) {
        // Use sendBeacon for reliable delivery
        const events = eventQueue.current
        const payload = JSON.stringify({ attemptId, events })
        navigator.sendBeacon('/api/events/batch', payload)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [attemptId])

  return { addEvent, flushEvents }
}
