/**
 * Chat Service - Centralized API calls for chat functionality
 * All requests go through Next.js backend which proxies to ai-service
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentName?: string;
  toolCalls?: any[];
}

export interface ChatSession {
  sessionId: string;
  history: ChatMessage[];
  context?: any;
}

export interface SendMessageResponse {
  success: boolean;
  response: string;
  sessionId: string;
  agentName?: string;
  toolCalls?: any[];
  context?: any;
  error?: string;
}

export interface StartSessionResponse {
  success: boolean;
  sessionId: string;
  greeting: string;
  agentName: string;
  context?: any;
  error?: string;
}

export interface SessionHistoryResponse {
  success: boolean;
  sessionId: string;
  history: any[];
  context?: any;
  error?: string;
}

export interface LiveSession {
  session_id: string;
  user_id?: number;
  user_role?: string;
  started_at: string;
  message_count: number;
  last_message?: string;
  agent_name?: string;
}

export interface LiveSessionsResponse {
  success: boolean;
  sessions: LiveSession[];
  count: number;
  error?: string;
}

export interface UserSession {
  session_id: string;
  created_at: string;
  last_activity: string;
  message_count: number;
  preview: string;
  context?: any;
}

export interface UserSessionsResponse {
  success: boolean;
  sessions: UserSession[];
  count: number;
  error?: string;
}

class ChatService {
  private getAuthToken(): string | null {
    // Get auth token from localStorage
    if (typeof window === 'undefined') return null;

    const userStr = localStorage.getItem('urackit_user');
    if (!userStr) return null;

    try {
      const user = JSON.parse(userStr);
      // Create JWT-like token from user data
      return btoa(JSON.stringify({
        userId: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
        organizationId: user.organization_id,
        contactId: user.contact_id,
        agentId: user.support_agent_id,
        specialization: user.specialization,
      }));
    } catch (err) {
      console.error('Error parsing user data:', err);
      return null;
    }
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
  }

  /**
   * Start a new chat session
   */
  async startSession(): Promise<StartSessionResponse> {
    try {
      const response = await this.fetchWithAuth('/api/chat/start', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start session');
      }

      return data;
    } catch (error: any) {
      console.error('Error starting session:', error);
      return {
        success: false,
        sessionId: '',
        greeting: '',
        agentName: '',
        error: error.message,
      };
    }
  }

  /**
   * Send a message in a chat session
   */
  async sendMessage(message: string, sessionId?: string): Promise<SendMessageResponse> {
    try {
      const response = await this.fetchWithAuth('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          message,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      return data;
    } catch (error: any) {
      console.error('Error sending message:', error);
      return {
        success: false,
        response: '',
        sessionId: sessionId || '',
        error: error.message,
      };
    }
  }

  /**
   * Get session history
   */
  async getSessionHistory(sessionId: string): Promise<SessionHistoryResponse> {
    try {
      const response = await this.fetchWithAuth(`/api/chat/session/${sessionId}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get session history');
      }

      return data;
    } catch (error: any) {
      console.error('Error getting session history:', error);
      return {
        success: false,
        sessionId,
        history: [],
        error: error.message,
      };
    }
  }

  /**
   * End a chat session
   */
  async endSession(sessionId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await this.fetchWithAuth(`/api/chat/session/${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end session');
      }

      return data;
    } catch (error: any) {
      console.error('Error ending session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all active chat sessions (Admin only)
   */
  async getLiveSessions(): Promise<LiveSessionsResponse> {
    try {
      const response = await this.fetchWithAuth('/api/chat/live-sessions', {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get live sessions');
      }

      return data;
    } catch (error: any) {
      console.error('Error getting live sessions:', error);
      return {
        success: false,
        sessions: [],
        count: 0,
        error: error.message,
      };
    }
  }

  /**
   * Get all sessions for current user
   */
  async getUserSessions(): Promise<UserSessionsResponse> {
    try {
      const response = await this.fetchWithAuth('/api/chat/user-sessions', {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get user sessions');
      }

      return data;
    } catch (error: any) {
      console.error('Error getting user sessions:', error);
      return {
        success: false,
        sessions: [],
        count: 0,
        error: error.message,
      };
    }
  }

  /**
   * Save session ID to localStorage for persistence
   */
  saveSessionId(sessionId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('chat_session_id', sessionId);
  }

  /**
   * Load session ID from localStorage
   */
  loadSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('chat_session_id');
  }

  /**
   * Clear saved session ID
   */
  clearSessionId(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('chat_session_id');
  }
}

// Export singleton instance
export const chatService = new ChatService();
