import { useRef, useEffect } from 'react';
import ChatBubble from './ChatBubble';
import { Monitor, Loader2, User } from 'lucide-react';

const ChatWindow = ({ ticket, messages, sending }) => {
    const scrollRef = useRef(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, sending]);

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="max-w-3xl mx-auto space-y-6 pb-4">
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Monitor className="text-blue-600" size={32} />
                    </div>
                    <p className="text-gray-400 text-sm">Ticket created on {new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>

                {messages.map((msg, idx) => (
                    <ChatBubble
                        key={idx}
                        message={msg}
                        isUser={!!msg.sender_contact_id}
                    />
                ))}

                {sending && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm ml-4 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <Loader2 size={14} className="animate-spin" />
                        </div>
                        <span>AI Assistant is typing...</span>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>
        </div>
    );
};

export default ChatWindow;
