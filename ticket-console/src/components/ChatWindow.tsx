'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatWindow() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate JWT token when user is available
  useEffect(() => {
    const fetchToken = async () => {
      if (user && !authToken) {
        try {
          const response = await fetch('/api/auth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              role: user.role,
              email: user.email,
              name: user.name,
              organizationId: (user as any).organization_id,
              contactId: (user as any).contact_id,
              agentId: (user as any).agent_id,
              specialization: (user as any).specialization,
            }),
          });

          const data = await response.json();
          if (data.success && data.token) {
            setAuthToken(data.token);
          } else {
            console.error('Failed to generate token:', data.error);
          }
        } catch (error) {
          console.error('Error generating token:', error);
        }
      }
    };

    fetchToken();
  }, [user, authToken]);

  // Start chat session when component mounts
  useEffect(() => {
    const startSession = async () => {
      if (!user || !authToken || chatSessionId) return;

      try {
        setIsInitializing(true);
        const response = await fetch('/api/ai-service/chat/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to start session');
        }

        if (data.sessionId) {
          setChatSessionId(data.sessionId);
        }

        // Set initial greeting message if provided
        if (data.greeting) {
          setMessages([{
            role: 'assistant',
            content: data.greeting,
            timestamp: new Date(),
          }]);
        } else {
          // Fallback greeting
          setMessages([{
            role: 'assistant',
            content: "Hello! I'm your AI assistant. How can I help you today?",
            timestamp: new Date(),
          }]);
        }
      } catch (error: any) {
        console.error('Error starting session:', error);
        // Set fallback greeting on error
        setMessages([{
          role: 'assistant',
          content: "Hello! I'm your AI assistant. How can I help you today?",
          timestamp: new Date(),
        }]);
      } finally {
        setIsInitializing(false);
      }
    };

    if (user && authToken && !chatSessionId) {
      startSession();
    }
  }, [user, authToken, chatSessionId]);

  // Load session history if sessionId exists (e.g., from URL or storage)
  useEffect(() => {
    const loadSessionHistory = async () => {
      if (!chatSessionId || !authToken || messages.length > 0) return;

      try {
        const response = await fetch(`/api/ai-service/session/${chatSessionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.messages && data.messages.length > 0) {
          const loadedMessages: Message[] = data.messages.map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          }));
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error('Error loading session history:', error);
        // Continue with empty messages if load fails
      }
    };

    if (chatSessionId && authToken) {
      loadSessionHistory();
    }
  }, [chatSessionId, authToken]);

  // Cleanup: End session when component unmounts (optional)
  useEffect(() => {
    return () => {
      // Optional: Clean up session on unmount
      // Uncomment if you want to clear session when leaving the page
      // if (chatSessionId && authToken) {
      //   fetch(`/api/ai-service/session/${chatSessionId}`, {
      //     method: 'DELETE',
      //     headers: { 'Authorization': `Bearer ${authToken}` },
      //   }).catch(console.error);
      // }
    };
  }, [chatSessionId, authToken]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing || !user) return;

    const messageContent = inputValue.trim();
    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      // Use the existing authToken from state
      if (!authToken) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: messageContent,
          sessionId: chatSessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Update session ID if new
      if (data.sessionId && data.sessionId !== chatSessionId) {
        setChatSessionId(data.sessionId);
      }

      const aiMessage: Message = {
        role: 'assistant',
        content: data.response || 'I received your message but had no response.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: error.message || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col h-full bg-gray-50 overflow-hidden items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="mt-4 text-sm text-gray-600">Starting chat session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
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
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t border-gray-200 bg-white p-4 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
