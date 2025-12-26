import { Bot, User, AlertCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatBubble = ({ message, isUser }) => {

    // 1. Handle "System Events" (like Escalations)
    if (message.message_type === 'event') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center my-6"
            >
                <div className="bg-yellow-50 text-yellow-700 text-xs font-bold px-4 py-1.5 rounded-full flex items-center border border-yellow-200 shadow-sm">
                    <AlertCircle size={14} className="mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ node, ...props }) => <p className="mb-0" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-bold text-yellow-800" {...props} />,
                                a: ({ node, ...props }) => <a className="underline hover:decoration-2" {...props} />,
                                code: ({ node, ...props }) => <code className="bg-yellow-100 px-1 rounded font-mono" {...props} />
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                </div>
            </motion.div>
        );
    }

    // 2. Handle Normal Chat Messages
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            {/* Avatar for AI */}
            {!isUser && (
                <div className="flex-shrink-0 mr-3 flex flex-col justify-end">
                    <div className="bg-gradient-to-br from-gray-700 to-gray-900 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md border border-gray-600">
                        <Bot size={16} />
                    </div>
                </div>
            )}

            <div className={`max-w-[75%] group relative shadow-sm ${isUser
                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' // User Styling (iMessage Blue)
                : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm' // AI Styling (Clean White)
                }`}>

                <div className="px-5 py-3.5">
                    {/* AI Label (Optional, maybe simpler without it for "clean" look, let's keep it subtle) */}
                    {!isUser && (
                        <div className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider flex items-center">
                            AI Assistant
                        </div>
                    )}

                    {/* Message Content */}
                    {message.message_type === 'image' || message.content.startsWith('![Image]') ? (
                        <div className="mb-1 -mx-2 -mt-2">
                            <img
                                src={message.content.match(/\((.*?)\)/)?.[1] || message.content}
                                alt="Attachment"
                                className="rounded-xl w-full max-h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity border border-gray-100"
                                onClick={() => window.open(message.content.match(/\((.*?)\)/)?.[1] || message.content, '_blank')}
                            />
                        </div>
                    ) : (
                        <div className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-gray-800'}`}>
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                    li: ({ node, ...props }) => <li className="" {...props} />,
                                    a: ({ node, ...props }) => <a className="underline hover:opacity-80 transition-opacity" target="_blank" rel="noopener noreferrer" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                                    code: ({ node, inline, className, children, ...props }) => {
                                        return inline ? (
                                            <code className={`px-1.5 py-0.5 rounded font-mono text-xs ${isUser ? 'bg-white/20' : 'bg-gray-100 text-red-500'}`} {...props}>
                                                {children}
                                            </code>
                                        ) : (
                                            <div className="my-3 overflow-hidden rounded-lg border border-gray-100 shadow-sm">
                                                <div className="bg-gray-50 px-3 py-1 text-xs text-gray-500 border-b border-gray-100 font-mono">Output</div>
                                                <code className="block bg-white p-3 overflow-x-auto font-mono text-xs text-gray-800 whitespace-pre">
                                                    {children}
                                                </code>
                                            </div>
                                        );
                                    },
                                    blockquote: ({ node, ...props }) => <blockquote className={`border-l-4 pl-3 italic my-2 ${isUser ? 'border-white/40' : 'border-blue-200 text-gray-500'}`} {...props} />,
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Timestamp (Visible on Hover) */}
                <div className={`absolute -bottom-5 text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'right-0' : 'left-0'}`}>
                    {new Date(message.message_time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            {/* Avatar for User */}
            {isUser && (
                <div className="flex-shrink-0 ml-3 flex flex-col justify-end">
                    <div className="bg-gradient-to-br from-blue-400 to-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md border border-blue-400">
                        <User size={16} />
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ChatBubble;