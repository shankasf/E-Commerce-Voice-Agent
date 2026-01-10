'use client';

import { User, Bot, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { TicketMessage } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';

// Streaming text component for ChatGPT-like effect
function StreamingText({ text, onComplete }: { text: string; onComplete?: () => void }) {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const indexRef = useRef(0);

    useEffect(() => {
        // Reset when text changes
        setDisplayedText('');
        indexRef.current = 0;
        setIsComplete(false);

        const words = text.split(' ');

        const streamWords = () => {
            if (indexRef.current < words.length) {
                setDisplayedText(words.slice(0, indexRef.current + 1).join(' '));
                indexRef.current++;
                // Random delay between 20-60ms for natural feel
                const delay = Math.random() * 40 + 20;
                setTimeout(streamWords, delay);
            } else {
                setIsComplete(true);
                onComplete?.();
            }
        };

        // Start streaming after a brief delay
        const timer = setTimeout(streamWords, 100);
        return () => clearTimeout(timer);
    }, [text, onComplete]);

    return (
        <>
            {parseMarkdown(displayedText)}
            {!isComplete && <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-0.5" />}
        </>
    );
}

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
    shouldStream?: boolean;
}

export function ChatMessage({ message, currentUserId, userRole, shouldStream = false }: ChatMessageProps) {
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

    // Get avatar colors based on sender type - Dark Theme
    const getAvatarStyle = () => {
        if (isBot) return 'bg-purple-600/20 border border-purple-500/50';
        if (isAgent) return 'bg-green-600/20 border border-green-500/50';
        return 'bg-blue-600/20 border border-blue-500/50';
    };

    const getAvatarIconColor = () => {
        if (isBot) return 'text-purple-400';
        if (isAgent) return 'text-green-400';
        return 'text-blue-400';
    };

    // Get bubble colors based on sender - Dark Theme
    const getBubbleStyle = () => {
        if (isFromMe) {
            // My messages - right side, colored with transparency
            if (userRole === 'requester') {
                return 'bg-blue-600/50 border border-blue-500/50 text-blue-100';
            } else if (userRole === 'agent') {
                return 'bg-green-600/50 border border-green-500/50 text-green-100';
            } else {
                return 'bg-purple-600/50 border border-purple-500/50 text-purple-100';
            }
        }
        // Other's messages - left side, dark with transparency
        return 'bg-slate-800/50 border border-slate-700/50 text-slate-200';
    };

    return (
        <div className={`flex gap-4 ${isFromMe ? 'flex-row-reverse' : ''}`} style={{ opacity: 1, backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
            {/* Avatar - Dark Theme with rounded edges */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${getAvatarStyle()}`} style={{ opacity: 1, backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
                {isBot ? (
                    <Bot className={`w-6 h-6 ${getAvatarIconColor()}`} />
                ) : (
                    <User className={`w-6 h-6 ${getAvatarIconColor()}`} />
                )}
            </div>

            {/* Message Content */}
            <div className={`flex flex-col max-w-[75%] ${isFromMe ? 'items-end' : 'items-start'}`}>
                {/* Sender info - Dark Theme */}
                <div className={`flex items-center gap-2.5 mb-2 ${isFromMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm font-bold text-slate-200">{senderName}</span>
                    <span className="text-xs text-slate-400 font-medium">
                        {format(new Date(message.message_time), 'MMM d, h:mm a')}
                    </span>
                    {isBot && (
                        <span className="badge badge-purple bg-purple-600/20 border border-purple-500/50 text-purple-300">
                            AI Bot
                        </span>
                    )}
                </div>

                {/* Message Bubble - Dark Theme with rounded edges */}
                <div className={`rounded-2xl px-5 py-3.5 shadow-lg ${getBubbleStyle()} ${isFromMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                    <div className="relative whitespace-pre-wrap break-words leading-relaxed text-[15px] font-medium">
                        {isBot && shouldStream ? (
                            <StreamingText text={message.content.replace(/<TERMINAL_COMMAND>.+?<\/TERMINAL_COMMAND>/g, '')} />
                        ) : isBot ? (
                            parseMarkdown(message.content.replace(/<TERMINAL_COMMAND>.+?<\/TERMINAL_COMMAND>/g, ''))
                        ) : (
                            message.content.replace(/<TERMINAL_COMMAND>.+?<\/TERMINAL_COMMAND>/g, '')
                        )}
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
    streamLatestBot?: boolean;
}

export function ChatContainer({
    messages,
    currentUserId,
    userRole,
    messagesEndRef,
    emptyMessage = 'No messages yet. Start the conversation below.',
    aiThinking = false,
    streamLatestBot = true
}: ChatContainerProps) {
    // Track which messages have been streamed already
    const [streamedMessageIds, setStreamedMessageIds] = useState<Set<number>>(new Set());

    // Find the latest bot message that hasn't been streamed AND is recent (within 5 seconds)
    const latestBotMessageId = (() => {
        if (!streamLatestBot) return null;
        const now = Date.now();
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            const isBot = msg.sender_agent_id && (msg.sender_agent as any)?.agent_type === 'Bot';
            // Only stream if message is from the last 5 seconds
            const messageTime = new Date(msg.message_time).getTime();
            const isRecent = (now - messageTime) < 5000;
            if (isBot && isRecent && !streamedMessageIds.has(msg.message_id)) {
                return msg.message_id;
            }
        }
        return null;
    })();

    // Mark message as streamed once it appears
    useEffect(() => {
        if (latestBotMessageId && !streamedMessageIds.has(latestBotMessageId)) {
            // Add a delay to ensure streaming completes before marking
            const timer = setTimeout(() => {
                setStreamedMessageIds(prev => new Set([...prev, latestBotMessageId]));
            }, 5000); // 5 seconds should be enough for most messages
            return () => clearTimeout(timer);
        }
    }, [latestBotMessageId, streamedMessageIds]);

    if (messages.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="w-16 h-16 bg-slate-800/50 border border-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-400">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 relative" style={{ backgroundColor: 'transparent', opacity: 1, backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
            {messages.map((msg) => {
                const isBot = msg.sender_agent_id && (msg.sender_agent as any)?.agent_type === 'Bot';
                const shouldStream = !!(isBot && msg.message_id === latestBotMessageId);

                return (
                    <div key={msg.message_id} style={{ opacity: 1, backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
                        <ChatMessage
                            message={msg}
                            currentUserId={currentUserId}
                            userRole={userRole}
                            shouldStream={shouldStream}
                        />
                    </div>
                );
            })}

            {/* AI Thinking Indicator - Dark Theme with rounded edges */}
            {aiThinking && (
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg bg-purple-600/20 border border-purple-500/50" style={{ opacity: 1 }}>
                        <Bot className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2.5 mb-2">
                            <span className="text-sm font-bold text-slate-200">AI Assistant</span>
                            <span className="badge badge-purple bg-purple-600/20 border border-purple-500/50 text-purple-300">
                                AI Bot
                            </span>
                        </div>
                        <div className="bg-slate-800/50 rounded-2xl rounded-tl-sm px-5 py-4 shadow-lg border border-purple-500/50" style={{ opacity: 1 }}>
                            <div className="flex items-center gap-3 text-slate-300">
                                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                                <span className="text-sm font-semibold">AI is thinking...</span>
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
            focus: 'focus:ring-blue-500/50 focus:border-blue-500/50',
            button: 'bg-blue-600/50 border border-blue-500/50 hover:bg-blue-600/70 text-blue-200',
        },
        green: {
            focus: 'focus:ring-green-500/50 focus:border-green-500/50',
            button: 'bg-green-600/50 border border-green-500/50 hover:bg-green-600/70 text-green-200',
        },
        purple: {
            focus: 'focus:ring-purple-500/50 focus:border-purple-500/50',
            button: 'bg-purple-600/50 border border-purple-500/50 hover:bg-purple-600/70 text-purple-200',
        },
    };

    const colors = colorClasses[accentColor];

    return (
        <div className="flex gap-3 items-end relative" style={{ position: 'relative', zIndex: 1, isolation: 'isolate' }}>
            <div className="flex-1 relative" style={{ zIndex: 2 }}>
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
                    className={`input resize-none bg-slate-800/50 border-2 border-slate-700/50 text-slate-200 shadow-lg hover:border-slate-600 hover:bg-slate-800/70 focus:bg-slate-800/70 transition-all duration-300 ${colors.focus} font-medium placeholder-slate-500 rounded-xl`}
                    style={{ minHeight: '56px', maxHeight: '140px', borderWidth: '2px', color: '#e2e8f0', backgroundColor: 'rgba(30, 41, 59, 0.5)' }}
                />
            </div>
            <button
                onClick={onSend}
                disabled={!value.trim() || sending}
                className={`btn ${colors.button} p-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden`}
                style={{ position: 'relative', zIndex: 3 }}
            >
                {sending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                )}
            </button>
        </div>
    );
}
