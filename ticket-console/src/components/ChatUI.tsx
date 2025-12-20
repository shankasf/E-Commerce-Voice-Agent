'use client';

import { User, Bot, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { TicketMessage } from '@/lib/supabase';

// Parse markdown-style formatting to React elements
function parseMarkdown(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIndex = 0;

    // Process line by line for better control
    const lines = remaining.split('\n');

    lines.forEach((line, lineIndex) => {
        // Add newline between lines (except first)
        if (lineIndex > 0) {
            parts.push(<br key={`br-${keyIndex++}`} />);
        }

        // Check for headers (## or **)
        let processedLine = line;
        const elements: React.ReactNode[] = [];
        let lastIndex = 0;

        // Match **bold** or __bold__ patterns
        const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
        let match;

        while ((match = boldRegex.exec(processedLine)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                elements.push(processedLine.substring(lastIndex, match.index));
            }
            // Add bold text
            const boldText = match[1] || match[2];
            elements.push(
                <strong key={`bold-${keyIndex++}`} className="font-semibold">
                    {boldText}
                </strong>
            );
            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < processedLine.length) {
            elements.push(processedLine.substring(lastIndex));
        }

        // If no formatting found, just add the line
        if (elements.length === 0) {
            parts.push(line);
        } else {
            parts.push(...elements);
        }
    });

    return parts;
}

interface ChatMessageProps {
    message: TicketMessage;
    currentUserId: number;
    userRole: 'agent' | 'requester' | 'admin';
}

export function ChatMessage({ message, currentUserId, userRole }: ChatMessageProps) {
    const isAgent = !!message.sender_agent_id;
    const isBot = isAgent && (message.sender_agent as any)?.agent_type === 'Bot';

    // Determine if this message is from the current user
    const isFromMe = (() => {
        if (userRole === 'requester') {
            return message.sender_contact_id === currentUserId;
        } else {
            return message.sender_agent_id === currentUserId;
        }
    })();

    // Get sender name
    const senderName = (() => {
        if (isFromMe) return 'You';
        if (isAgent) {
            return (message.sender_agent as any)?.full_name || 'Support Agent';
        }
        return (message.sender_contact as any)?.full_name || 'Customer';
    })();

    // Get avatar colors based on sender type
    const getAvatarStyle = () => {
        if (isBot) return 'bg-purple-100';
        if (isAgent) return 'bg-green-100';
        return 'bg-blue-100';
    };

    const getAvatarIconColor = () => {
        if (isBot) return 'text-purple-600';
        if (isAgent) return 'text-green-600';
        return 'text-blue-600';
    };

    // Get bubble colors based on sender
    const getBubbleStyle = () => {
        if (isFromMe) {
            // My messages - right side, colored
            if (userRole === 'requester') {
                return 'bg-blue-600 text-white';
            } else if (userRole === 'agent') {
                return 'bg-green-600 text-white';
            } else {
                return 'bg-purple-600 text-white';
            }
        }
        // Other's messages - left side, white
        return 'bg-white border border-gray-200 text-gray-700';
    };

    return (
        <div className={`flex gap-3 ${isFromMe ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${getAvatarStyle()}`}>
                {isBot ? (
                    <Bot className={`w-5 h-5 ${getAvatarIconColor()}`} />
                ) : (
                    <User className={`w-5 h-5 ${getAvatarIconColor()}`} />
                )}
            </div>

            {/* Message Content */}
            <div className={`flex flex-col max-w-[75%] ${isFromMe ? 'items-end' : 'items-start'}`}>
                {/* Sender info */}
                <div className={`flex items-center gap-2 mb-1 ${isFromMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm font-medium text-gray-700">{senderName}</span>
                    <span className="text-xs text-gray-400">
                        {format(new Date(message.message_time), 'MMM d, h:mm a')}
                    </span>
                    {isBot && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">
                            Bot
                        </span>
                    )}
                </div>

                {/* Message Bubble */}
                <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${getBubbleStyle()} ${isFromMe ? 'rounded-tr-sm' : 'rounded-tl-sm'
                    }`}>
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                        {isBot ? parseMarkdown(message.content) : message.content}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ChatContainerProps {
    messages: TicketMessage[];
    currentUserId: number;
    userRole: 'agent' | 'requester' | 'admin';
    messagesEndRef: React.RefObject<HTMLDivElement>;
    emptyMessage?: string;
    aiThinking?: boolean;
}

export function ChatContainer({
    messages,
    currentUserId,
    userRole,
    messagesEndRef,
    emptyMessage = 'No messages yet. Start the conversation below.',
    aiThinking = false
}: ChatContainerProps) {
    if (messages.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {messages.map((msg) => (
                <ChatMessage
                    key={msg.message_id}
                    message={msg}
                    currentUserId={currentUserId}
                    userRole={userRole}
                />
            ))}

            {/* AI Thinking Indicator */}
            {aiThinking && (
                <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-purple-100">
                        <Bot className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-700">AI Assistant</span>
                            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">
                                Bot
                            </span>
                        </div>
                        <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                <span className="text-sm">AI is thinking...</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    sending: boolean;
    placeholder?: string;
    accentColor?: 'blue' | 'green' | 'purple';
}

export function ChatInput({
    value,
    onChange,
    onSend,
    sending,
    placeholder = 'Type your message...',
    accentColor = 'blue'
}: ChatInputProps) {
    const colorClasses = {
        blue: {
            focus: 'focus:ring-blue-500 focus:border-blue-500',
            button: 'bg-blue-600 hover:bg-blue-700',
        },
        green: {
            focus: 'focus:ring-green-500 focus:border-green-500',
            button: 'bg-green-600 hover:bg-green-700',
        },
        purple: {
            focus: 'focus:ring-purple-500 focus:border-purple-500',
            button: 'bg-purple-600 hover:bg-purple-700',
        },
    };

    const colors = colorClasses[accentColor];

    return (
        <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onSend();
                        }
                    }}
                    placeholder={placeholder}
                    rows={1}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl resize-none ${colors.focus} focus:ring-2 transition-shadow`}
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                />
            </div>
            <button
                onClick={onSend}
                disabled={!value.trim() || sending}
                className={`p-3 ${colors.button} text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm`}
            >
                {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                )}
            </button>
        </div>
    );
}
