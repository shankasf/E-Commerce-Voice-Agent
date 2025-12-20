'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, Bot, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ConversationSidebar } from './ConversationSidebar';
import {
  getAllConversations,
  saveConversation,
  getConversation,
  deleteConversation,
  generateConversationTitle,
  createConversationId,
  Conversation,
} from '@/lib/conversationService';

// Import markdown parsing functions from ChatAgentWindow
// (We'll keep the same markdown parsing logic)

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  hasButtons?: boolean;
  buttons?: Array<{ label: string; value: string }>;
}

export function ChatAgentWindowWithMemory({ isWidget = false }: { isWidget?: boolean }) {
  const { user } = useAuth();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI troubleshooting assistant. I'm a powerful computer and server diagnoser. To get started, please provide me with the ticket ID you're working on, and I'll fetch the device details to help you troubleshoot the issue.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<any>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [titleGenerated, setTitleGenerated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessagesRef = useRef<string>('');

  // Load conversations on mount
  useEffect(() => {
    const loaded = getAllConversations();
    setConversations(loaded);
    
    if (loaded.length === 0) {
      createNewConversation();
    } else {
      // Load the most recent conversation
      loadConversation(loaded[0].id);
    }
  }, []);

  // Auto-save conversation when messages change
  useEffect(() => {
    if (!currentConversationId || messages.length <= 1) return;
    
    const currentMessagesStr = JSON.stringify(messages);
    if (previousMessagesRef.current === currentMessagesStr) return;
    
    const conversation: Conversation = {
      id: currentConversationId,
      title: conversations.find(c => c.id === currentConversationId)?.title || 'New Conversation',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
      ticketId: ticketId || undefined,
      deviceDetails: deviceDetails || undefined,
      conversationHistory: conversationHistory,
      createdAt: conversations.find(c => c.id === currentConversationId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    saveConversation(conversation);
    setConversations(getAllConversations());
    previousMessagesRef.current = currentMessagesStr;
  }, [messages, conversationHistory, ticketId, deviceDetails, currentConversationId]);

  // Generate title after first few messages
  useEffect(() => {
    if (currentConversationId && !titleGenerated && messages.length >= 3) {
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length >= 1) {
        generateTitleForConversation();
        setTitleGenerated(true);
      }
    }
  }, [messages.length, currentConversationId, titleGenerated]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewConversation = () => {
    const newId = createConversationId();
    const initialMessages: Message[] = [
      {
        role: 'assistant',
        content: "Hello! I'm your AI troubleshooting assistant. I'm a powerful computer and server diagnoser. To get started, please provide me with the ticket ID you're working on, and I'll fetch the device details to help you troubleshoot the issue.",
        timestamp: new Date(),
      },
    ];
    
    setCurrentConversationId(newId);
    setMessages(initialMessages);
    setConversationHistory([]);
    setTicketId(null);
    setDeviceDetails(null);
    setInputValue('');
    setTitleGenerated(false);
    
    const conversation: Conversation = {
      id: newId,
      title: 'New Conversation',
      messages: initialMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
      conversationHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    saveConversation(conversation);
    setConversations(getAllConversations());
    previousMessagesRef.current = JSON.stringify(initialMessages);
  };

  const loadConversation = (conversationId: string) => {
    if (conversationId === currentConversationId) return;
    
    const conversation = getConversation(conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setMessages(
        conversation.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp as string),
        })) as Message[]
      );
      setConversationHistory(conversation.conversationHistory || []);
      setTicketId(conversation.ticketId || null);
      setDeviceDetails(conversation.deviceDetails || null);
      setInputValue('');
      setTitleGenerated(!!conversation.title && conversation.title !== 'New Conversation');
      previousMessagesRef.current = JSON.stringify(conversation.messages);
      
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const generateTitleForConversation = async () => {
    if (!currentConversationId) return;
    
    try {
      const title = await generateConversationTitle(conversationHistory, ticketId || undefined);
      const conversation = getConversation(currentConversationId);
      if (conversation) {
        conversation.title = title;
        saveConversation(conversation);
        setConversations(getAllConversations());
      }
    } catch (error) {
      console.error('Error generating title:', error);
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    deleteConversation(conversationId);
    const updated = getAllConversations();
    setConversations(updated);
    
    if (updated.length === 0) {
      createNewConversation();
    } else if (conversationId === currentConversationId) {
      loadConversation(updated[0].id);
    }
  };

  // Extract ticket ID from user input
  const extractTicketId = (text: string): number | null => {
    const match = text.match(/#?(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  // Fetch device details by ticket ID
  const fetchDeviceDetails = async (ticketIdNum: number) => {
    try {
      const response = await fetch(`/tms/api/chat-agent/device-details?ticketId=${ticketIdNum}`);
      if (!response.ok) throw new Error('Failed to fetch device details');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching device details:', error);
      return null;
    }
  };

  // Send message to AI agent
  const sendToAI = async (userMessage: string) => {
    try {
      const response = await fetch('/tms/api/chat-agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          ticketId,
          deviceDetails,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error sending message to AI:', error);
      if (error.message?.includes('404') || error.message?.includes('Failed to fetch')) {
        return {
          message: 'The chat API route is not available. Please restart the development server.',
          hasButtons: false,
        };
      }
      return { message: 'Sorry, I encountered an error. Please try again.', hasButtons: false };
    }
  };

  // Document the resolution
  const handleDocumentIt = async () => {
    if (!ticketId) {
      alert('Please provide a ticket ID first');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch('/tms/api/chat-agent/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          conversationHistory,
          deviceDetails,
        }),
      });

      if (!response.ok) throw new Error('Failed to document resolution');
      const data = await response.json();

      const systemMessage: Message = {
        role: 'system',
        content: `✓ Resolution documented successfully! Document ID: ${data.documentId || 'N/A'}. This solution has been saved to the knowledge base for future reference.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
      setConversationHistory((prev) => [
        ...prev,
        { role: 'system', content: systemMessage.content },
      ]);
    } catch (error) {
      console.error('Error documenting resolution:', error);
      const errorMessage: Message = {
        role: 'system',
        content: 'Failed to document resolution. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const messageContent = inputValue.trim();
    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setConversationHistory((prev) => [...prev, { role: 'user', content: messageContent }]);
    setInputValue('');
    setIsProcessing(true);

    try {
      // Check if user provided a ticket ID
      const extractedTicketId = extractTicketId(messageContent);
      if (extractedTicketId && !ticketId) {
        setTicketId(extractedTicketId);
        const systemMsg: Message = {
          role: 'system',
          content: `Fetching device details for ticket #${extractedTicketId}...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMsg]);

        const deviceData = await fetchDeviceDetails(extractedTicketId);
        if (deviceData) {
          setDeviceDetails(deviceData);
          const successMsg: Message = {
            role: 'system',
            content: `✓ Device details loaded. I now have information about the device associated with this ticket. How can I help you troubleshoot?`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMsg]);
        } else {
          const errorMsg: Message = {
            role: 'system',
            content: `Could not fetch device details for ticket #${extractedTicketId}. You can still ask me questions, and I'll do my best to help.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
        setIsProcessing(false);
        return;
      }

      // Send to AI
      const aiResponse = await sendToAI(messageContent);
      const aiMessage: Message = {
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
        hasButtons: aiResponse.hasButtons,
        buttons: aiResponse.buttons,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setConversationHistory((prev) => [...prev, { role: 'assistant', content: aiResponse.message }]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickResponse = async (response: string) => {
    setInputValue(response);
    setTimeout(() => handleSendMessage(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Simple markdown parser (inline version)
  const parseMarkdown = (text: string): React.ReactNode => {
    // Simple bold and code parsing
    const parts: React.ReactNode[] = [];
    const lines = text.split('\n');
    
    lines.forEach((line, idx) => {
      if (idx > 0) parts.push(<br key={`br-${idx}`} />);
      
      // Headers
      if (line.startsWith('## ')) {
        parts.push(<h3 key={`h-${idx}`} className="font-bold text-base mt-2 mb-1">{line.substring(3)}</h3>);
        return;
      }
      if (line.startsWith('### ')) {
        parts.push(<h4 key={`h4-${idx}`} className="font-semibold text-sm mt-2 mb-1">{line.substring(4)}</h4>);
        return;
      }
      
      // Lists
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, '');
        parts.push(
          <div key={`list-${idx}`} className="ml-4 my-1">
            <span className="font-medium">{line.match(/^\d+\./)?.[0]}</span> {parseInlineMarkdown(content)}
          </div>
        );
        return;
      }
      
      if (/^[-*]\s/.test(line)) {
        const content = line.replace(/^[-*]\s/, '');
        parts.push(
          <div key={`bullet-${idx}`} className="ml-4 my-1 flex">
            <span className="mr-2">•</span>
            <span>{parseInlineMarkdown(content)}</span>
          </div>
        );
        return;
      }
      
      if (line.trim()) {
        parts.push(<div key={`line-${idx}`}>{parseInlineMarkdown(line)}</div>);
      }
    });
    
    return <>{parts}</>;
  };

  const parseInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIndex = 0;
    let lastIndex = 0;

    // Code
    const codeRegex = /`([^`]+)`/g;
    let match;
    const allMatches: Array<{ index: number; length: number; type: 'code' | 'bold'; content: string }> = [];

    while ((match = codeRegex.exec(remaining)) !== null) {
      allMatches.push({ index: match.index, length: match[0].length, type: 'code', content: match[1] });
    }

    // Bold
    const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
    while ((match = boldRegex.exec(remaining)) !== null) {
      allMatches.push({ index: match.index, length: match[0].length, type: 'bold', content: match[1] || match[2] });
    }

    allMatches.sort((a, b) => a.index - b.index);

    allMatches.forEach((matchInfo) => {
      if (matchInfo.index > lastIndex) {
        parts.push(remaining.substring(lastIndex, matchInfo.index));
      }
      if (matchInfo.type === 'code') {
        parts.push(
          <code key={`code-${keyIndex++}`} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
            {matchInfo.content}
          </code>
        );
      } else {
        parts.push(
          <strong key={`bold-${keyIndex++}`} className="font-semibold">
            {matchInfo.content}
          </strong>
        );
      }
      lastIndex = matchInfo.index + matchInfo.length;
    });

    if (lastIndex < remaining.length) {
      parts.push(remaining.substring(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  return (
    <div className={`flex h-full ${isWidget ? '' : 'h-full'}`}>
      {/* Sidebar - Only show if not widget, positioned left-most */}
      {!isWidget && (
        <div className="shrink-0 h-full">
          <ConversationSidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={loadConversation}
            onNewConversation={createNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>
      )}

      {/* Chat Area */}
      <div className="flex flex-col flex-1 bg-gray-50 min-w-0 h-full overflow-hidden">
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
                  msg.role === 'user'
                    ? 'bg-green-600'
                    : msg.role === 'system'
                    ? 'bg-yellow-100'
                    : 'bg-green-100'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className={`w-4 h-4 ${msg.role === 'system' ? 'text-yellow-600' : 'text-green-600'}`} />
                )}
              </div>

              {/* Message Content */}
              <div className={`flex flex-col max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-green-600 text-white rounded-tr-sm'
                      : msg.role === 'system'
                      ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-tl-sm'
                      : 'bg-white border border-gray-200 text-gray-700 rounded-tl-sm'
                  }`}
                >
                  <div className="break-words text-sm leading-relaxed">
                    {msg.role === 'assistant' || msg.role === 'system' ? (
                      parseMarkdown(msg.content)
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>

                {/* Quick Buttons */}
                {msg.hasButtons && msg.buttons && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {msg.buttons.map((btn, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickResponse(btn.value)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {btn.label}
                      </button>
                    ))}
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
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-green-100">
                <Bot className="w-4 h-4 text-green-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="border-t border-gray-200 bg-white p-4 shrink-0">
          {/* Document It Button */}
          {ticketId && (
            <button
              onClick={handleDocumentIt}
              disabled={isProcessing}
              className="w-full mb-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Document It
            </button>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={ticketId ? "Ask me anything about troubleshooting..." : "Enter ticket ID (e.g., #123) or ask a question..."}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

