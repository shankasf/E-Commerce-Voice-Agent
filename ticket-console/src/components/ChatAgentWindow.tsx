'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, Bot, User, Mic, Phone } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

// Parse markdown to React elements
function parseMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const lines = text.split('\n');
  let keyIndex = 0;

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      parts.push(<br key={`br-${keyIndex++}`} />);
    }

    // Handle headers (## Header)
    if (line.startsWith('## ')) {
      parts.push(
        <h3 key={`h3-${keyIndex++}`} className="font-bold text-base mt-2 mb-1">
          {line.substring(3)}
        </h3>
      );
      return;
    }

    if (line.startsWith('### ')) {
      parts.push(
        <h4 key={`h4-${keyIndex++}`} className="font-semibold text-sm mt-2 mb-1">
          {line.substring(4)}
        </h4>
      );
      return;
    }

    // Handle code blocks (```code```)
    if (line.trim().startsWith('```')) {
      return; // Skip code block markers for now
    }

    // Handle "Step X:" patterns
    if (/^Step\s+\d+:/i.test(line)) {
      const match = line.match(/^(Step\s+\d+:)/i);
      if (match) {
        const content = line.substring(match[0].length).trim();
        parts.push(
          <div key={`step-${keyIndex++}`} className="my-2">
            <span className="font-semibold text-green-700">{match[0]}</span>{' '}
            {parseInlineMarkdown(content)}
          </div>
        );
        return;
      }
    }

    // Handle numbered lists (1. item)
    if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, '');
      parts.push(
        <div key={`list-${keyIndex++}`} className="ml-4 my-1">
          <span className="font-medium">{line.match(/^\d+\./)?.[0]}</span> {parseInlineMarkdown(content)}
        </div>
      );
      return;
    }

    // Handle bullet points (- item or * item)
    if (/^[-*]\s/.test(line)) {
      const content = line.replace(/^[-*]\s/, '');
      parts.push(
        <div key={`bullet-${keyIndex++}`} className="ml-4 my-1 flex">
          <span className="mr-2">•</span>
          <span>{parseInlineMarkdown(content)}</span>
        </div>
      );
      return;
    }

    // Regular line with inline markdown
    if (line.trim()) {
      parts.push(<div key={`line-${keyIndex++}`}>{parseInlineMarkdown(line)}</div>);
    } else {
      parts.push(<div key={`empty-${keyIndex++}`} className="h-2" />);
    }
  });

  return parts;
}

// Parse inline markdown (bold, code, etc.)
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;
  let lastIndex = 0;

  // Process all inline markdown patterns
  const patterns: Array<{ regex: RegExp; render: (match: RegExpMatchArray) => React.ReactNode }> = [
    // Inline code `code`
    {
      regex: /`([^`]+)`/g,
      render: (match) => (
        <code key={`code-${keyIndex++}`} className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
          {match[1]}
        </code>
      ),
    },
    // Bold **text** or __text__
    {
      regex: /\*\*(.+?)\*\*|__(.+?)__/g,
      render: (match) => (
        <strong key={`bold-${keyIndex++}`} className="font-semibold">
          {match[1] || match[2]}
        </strong>
      ),
    },
  ];

  // Find all matches and sort by position
  const allMatches: Array<{ index: number; length: number; render: () => React.ReactNode }> = [];

  patterns.forEach(({ regex, render }) => {
    let match;
    regex.lastIndex = 0; // Reset regex
    while ((match = regex.exec(remaining)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        render: () => render.call(null, match!),
      });
    }
  });

  // Sort by index
  allMatches.sort((a, b) => a.index - b.index);

  // Build parts array
  allMatches.forEach((matchInfo) => {
    // Add text before the match
    if (matchInfo.index > lastIndex) {
      parts.push(remaining.substring(lastIndex, matchInfo.index));
    }
    // Add the formatted element
    parts.push(matchInfo.render());
    lastIndex = matchInfo.index + matchInfo.length;
  });

  // Add remaining text
  if (lastIndex < remaining.length) {
    parts.push(remaining.substring(lastIndex));
  }

  // If no formatting found, return as-is
  if (parts.length === 0) {
    return [text];
  }

  return parts;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  hasButtons?: boolean;
  buttons?: Array<{ label: string; value: string }>;
}

export function ChatAgentWindow({ isWidget = false }: { isWidget?: boolean }) {
  const { user } = useAuth();
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
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      // Check if it's a 404 - route not found
      if (error.message?.includes('404') || error.message?.includes('Failed to fetch')) {
        return { 
          message: 'The chat API route is not available. Please restart the development server to load the new API routes.', 
          hasButtons: false 
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
        content: `✓ Resolution documented successfully! Document ID: ${data.documentId}. This solution has been saved to the knowledge base for future reference.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
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

  return (
    <div className={`flex flex-col ${isWidget ? 'h-full' : 'h-full'} bg-gray-50 overflow-hidden`}>
      {/* Messages Area - Scrollable */}
      <div className={`flex-1 overflow-y-auto ${isWidget ? 'p-4' : 'p-6'} space-y-4 min-h-0`}>
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
      <div className={`border-t border-gray-200 bg-white ${isWidget ? 'p-4' : 'p-6'} shrink-0`}>
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
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={`px-4 py-2 rounded-lg text-white transition-colors flex items-center justify-center ${
              isVoiceActive 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            title={isVoiceActive ? 'Stop voice input' : 'Start voice input'}
          >
            {isVoiceActive ? (
              <Phone className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

