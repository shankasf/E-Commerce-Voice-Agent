'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Plus, Clock, Trash2 } from 'lucide-react';
import { chatService, UserSession } from '@/lib/services/chatService';

interface ChatSidebarProps {
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ currentSessionId, onSessionSelect, onNewChat }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await chatService.getUserSessions();
      if (result.success) {
        setSessions(result.sessions);
      } else {
        setError(result.error || 'Failed to load sessions');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Reload sessions when current session changes (after first message sent)
  useEffect(() => {
    if (currentSessionId) {
      loadSessions();
    }
  }, [currentSessionId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm">Loading sessions...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={loadSessions}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm underline"
            >
              Retry
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No previous chats</p>
            <p className="text-xs mt-1">Start a new conversation</p>
          </div>
        ) : (
          <div className="py-2">
            {sessions.map((session) => (
              <button
                key={session.session_id}
                onClick={() => onSessionSelect(session.session_id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors border-l-2 ${
                  currentSessionId === session.session_id
                    ? 'bg-gray-800 border-blue-500'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-medium">
                      {session.preview}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">
                        {formatDate(session.last_activity)}
                      </span>
                      <span className="text-xs text-gray-600">•</span>
                      <span className="text-xs text-gray-500">
                        {session.message_count} messages
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-700 text-center">
        <p className="text-xs text-gray-500">
          {sessions.length} {sessions.length === 1 ? 'conversation' : 'conversations'}
        </p>
      </div>
    </div>
  );
}
