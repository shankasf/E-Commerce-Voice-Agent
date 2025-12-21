import { Bot, User, AlertCircle } from 'lucide-react';

const ChatBubble = ({ message, isUser }) => {

    // 1. Handle "System Events" (like Escalations)
    if (message.message_type === 'event') {
        return (
            <div className="flex justify-center my-4">
                <div className="bg-yellow-50 text-yellow-800 text-xs px-3 py-1 rounded-full flex items-center border border-yellow-200">
                    <AlertCircle size={12} className="mr-1" />
                    {message.content}
                </div>
            </div>
        );
    }

    // 2. Handle Normal Chat Messages
    return (
        <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>

            {/* Avatar for AI */}
            {!isUser && (
                <div className="flex-shrink-0 mr-2">
                    <div className="bg-slate-700 p-2 rounded-full text-white">
                        <Bot size={20} />
                    </div>
                </div>
            )}

            <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${isUser
                ? 'bg-blue-600 text-white rounded-br-none' // User Styling
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none' // AI Styling
                }`}>
                {/* AI Label */}
                {!isUser && (
                    <div className="text-xs font-bold text-slate-500 mb-1 flex items-center">
                        AI Support
                    </div>
                )}

                {/* Message Content */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                {/* Timestamp */}
                <div className={`text-[10px] mt-1 text-right ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(message.message_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            {/* Avatar for User */}
            {isUser && (
                <div className="flex-shrink-0 ml-2">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                        <User size={20} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatBubble;