'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, RefreshCw, Trash2, Wrench } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useChatSessionContext } from '@/lib/chat-session-context';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentName?: string;
  toolCalls?: any[];
}

export function ChatWindow() {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionStartedRef = useRef(false);

  // Use custom chat session hook from context
  const {
    sessionId,
    messages,
    isLoading,
    isProcessing,
    error,
    startSession,
    sendMessage,
    loadHistory,
    endSession,
    clearError,
  } = useChatSessionContext();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-focus input after AI responds
  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  // Always auto-start a new session when user navigates to chat page
  useEffect(() => {
    if (user && !sessionId && messages.length === 0 && !isLoading && !sessionStartedRef.current) {
      console.log('[ChatWindow] Auto-starting new session for user:', user.id);
      sessionStartedRef.current = true;
      startSession();
    }
  }, [user, sessionId, messages.length, isLoading, startSession]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing || !user) return;

    const messageContent = inputValue.trim();
    setInputValue('');

    await sendMessage(messageContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = async () => {
    if (sessionId) {
      await endSession();
    }
    await startSession();
  };

  const handleRefresh = async () => {
    if (sessionId) {
      await loadHistory();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header with controls */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI Assistant</h3>
              {sessionId && (
                <p className="text-xs text-gray-500">
                  Session: {sessionId.substring(0, 12)}...
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading || !sessionId}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              title="Refresh history"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleNewChat}
              disabled={isLoading}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              title="New chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between shrink-0">
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-blue-600' : 'bg-blue-100'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-blue-600" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex flex-col max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Agent name for AI messages */}
                  {msg.role === 'assistant' && msg.agentName && (
                    <span className="text-xs text-gray-500 mb-1">{msg.agentName}</span>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white border border-gray-200 text-gray-700 rounded-tl-sm'
                    }`}
                  >
                    <div className="break-words text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>

                  {/* Tool calls indicator */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Wrench className="w-3 h-3" />
                      <span>{msg.toolCalls.length} tool{msg.toolCalls.length > 1 ? 's' : ''} used</span>
                    </div>
                  )}

                  <span className="text-xs text-gray-400 mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-100">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t border-gray-200 bg-white p-4 shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isProcessing || isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing || isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
