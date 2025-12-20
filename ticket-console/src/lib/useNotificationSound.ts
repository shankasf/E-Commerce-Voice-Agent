'use client';

import { useCallback, useRef, useEffect } from 'react';

// Simple notification sound hook using Web Audio API
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<number>(0);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    // Initialize on user interaction
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keypress', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keypress', initAudio);
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    // Debounce - don't play more than once per second
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) return;
    lastPlayedRef.current = now;

    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      
      // Resume if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create a pleasant notification sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pleasant two-tone notification
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.1); // C6
      
      oscillator.type = 'sine';
      
      // Fade in and out for smooth sound
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.15);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
      console.log('[NotificationSound] Audio not available:', error);
    }
  }, []);

  return { playNotificationSound };
}

// Hook that tracks message count and plays sound on new messages
export function useMessageNotification(
  messages: Array<{ message_id: number; sender_agent_id?: number | null; sender_contact_id?: number | null }>,
  currentUserId: number | undefined,
  userRole: 'agent' | 'requester' | 'admin'
) {
  const { playNotificationSound } = useNotificationSound();
  const prevMessageCountRef = useRef<number>(0);
  const prevMessageIdsRef = useRef<Set<number>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!currentUserId || messages.length === 0) return;

    // Get current message IDs
    const currentIds = new Set(messages.map(m => m.message_id));
    
    // Skip initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      prevMessageCountRef.current = messages.length;
      prevMessageIdsRef.current = currentIds;
      return;
    }

    // Find new messages
    const newMessages = messages.filter(m => !prevMessageIdsRef.current.has(m.message_id));

    if (newMessages.length > 0) {
      // Check if any new message is from someone else
      const hasMessageFromOther = newMessages.some(msg => {
        if (userRole === 'requester') {
          // Requester: notify if message is from agent
          return !!msg.sender_agent_id;
        } else {
          // Agent/Admin: notify if message is from contact
          return !!msg.sender_contact_id;
        }
      });

      if (hasMessageFromOther) {
        console.log('[NotificationSound] New message from other party, playing sound');
        playNotificationSound();
      }
    }

    // Update refs
    prevMessageCountRef.current = messages.length;
    prevMessageIdsRef.current = currentIds;
  }, [messages, currentUserId, userRole, playNotificationSound]);
}
