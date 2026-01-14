import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService, ChatMessage, SendMessageResponse } from '@/lib/services/chatService';

// Global lock to prevent concurrent history loading across all component instances
let globalHistoryLock = false;

interface UseChatSessionReturn {
  sessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  startSession: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  endSession: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for managing chat sessions
 * Handles session lifecycle, message history, and persistence
 */
export function useChatSession(): UseChatSessionReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Track if we're currently loading to prevent concurrent calls
  const loadingHistoryRef = useRef(false);

  /**
   * Load history for a specific session
   */
  const loadHistoryForSession = useCallback(async (sessionIdToLoad: string) => {
    // Prevent concurrent calls (check both local and global locks)
    if (loadingHistoryRef.current || globalHistoryLock) {
      console.log('[useChatSession] Already loading history, skipping duplicate call');
      return;
    }

    loadingHistoryRef.current = true;
    globalHistoryLock = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log('[useChatSession] Loading history for session:', sessionIdToLoad);
      const result = await chatService.getSessionHistory(sessionIdToLoad);

      if (result.success && result.history) {
        // Convert history format to ChatMessage format
        const formattedMessages: ChatMessage[] = result.history.map((msg: any) => ({
          role: msg.role || 'assistant',
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          agentName: msg.agent_name,
          toolCalls: msg.tool_calls,
        }));

        setMessages(formattedMessages);
      } else {
        console.warn('No history found for session:', sessionIdToLoad);
        // If session not found, start a new one
        setSessionId(null);
        chatService.clearSessionId();
      }
    } catch (err: any) {
      console.error('Error loading history:', err);
      setError(err.message || 'Failed to load chat history');
      // Clear invalid session
      setSessionId(null);
      chatService.clearSessionId();
    } finally {
      setIsLoading(false);
      loadingHistoryRef.current = false;
      globalHistoryLock = false;
    }
  }, []);

  // Don't auto-load saved session on mount
  // Users should always start with a fresh chat
  useEffect(() => {
    if (isInitialized) return;

    // Clear any saved session ID since we always start fresh
    chatService.clearSessionId();
    setIsInitialized(true);
  }, [isInitialized]);

  /**
   * Start a new chat session
   */
  const startSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await chatService.startSession();

      if (result.success) {
        setSessionId(result.sessionId);
        chatService.saveSessionId(result.sessionId);

        // Add initial greeting
        setMessages([
          {
            role: 'assistant',
            content: result.greeting,
            timestamp: new Date(),
            agentName: result.agentName,
          },
        ]);
      } else {
        throw new Error(result.error || 'Failed to start session');
      }
    } catch (err: any) {
      console.error('Error starting session:', err);
      setError(err.message || 'Failed to start chat session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Send a message in the current session
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Add user message immediately (optimistic UI)
    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);
    setError(null);

    try {
      const result: SendMessageResponse = await chatService.sendMessage(message, sessionId || undefined);

      if (result.success) {
        // Update session ID if it's new
        if (result.sessionId && result.sessionId !== sessionId) {
          setSessionId(result.sessionId);
          chatService.saveSessionId(result.sessionId);
        }

        // Add AI response
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
          agentName: result.agentName,
          toolCalls: result.toolCalls,
        };

        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');

      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId]);

  /**
   * Load history for current session
   */
  const loadHistory = useCallback(async () => {
    if (!sessionId) {
      console.warn('No session ID to load history for');
      return;
    }

    await loadHistoryForSession(sessionId);
  }, [sessionId]);

  /**
   * End the current session
   */
  const endSession = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await chatService.endSession(sessionId);

      if (result.success) {
        setSessionId(null);
        setMessages([]);
        chatService.clearSessionId();
      } else {
        throw new Error(result.error || 'Failed to end session');
      }
    } catch (err: any) {
      console.error('Error ending session:', err);
      setError(err.message || 'Failed to end session');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Load a specific session by ID
   */
  const loadSession = useCallback(async (sessionIdToLoad: string) => {
    setSessionId(sessionIdToLoad);
    chatService.saveSessionId(sessionIdToLoad);
    await loadHistoryForSession(sessionIdToLoad);
  }, [loadHistoryForSession]);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sessionId,
    messages,
    isLoading,
    isProcessing,
    error,
    startSession,
    sendMessage,
    loadHistory,
    loadSession,
    endSession,
    clearError,
  };
}
