import { useRef, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Send, Loader2, Paperclip, Smile, Zap } from 'lucide-react';

const ChatInput = ({
    newMessage,
    setNewMessage,
    handleSend,
    sending,
    uploading,
    handleFileUpload,
    isClosed
}) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef(null);

    const onEmojiClick = (emojiObject) => {
        setNewMessage(prev => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    const handleQuickAction = (action) => {
        setNewMessage(action);
    };

    return (
        <div className="p-4 sm:p-6 bg-white border-t border-gray-200">
            <div className="max-w-3xl mx-auto space-y-4">
                {/* Quick Actions */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {['My screen is flickering', 'Request for human agent', 'Resolve ticket'].map((action) => (
                        <button
                            key={action}
                            onClick={() => handleQuickAction(action)}
                            className="flex-shrink-0 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                        >
                            <Zap size={12} />
                            {action}
                        </button>
                    ))}
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative"
                    >
                        {uploading ? <Loader2 size={20} className="animate-spin text-blue-500" /> : <Paperclip size={20} />}
                    </button>

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="w-full bg-gray-100 border-0 rounded-2xl pl-4 pr-12 py-3.5 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 placeholder:text-gray-400"
                            disabled={sending || isClosed}
                        />
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-500 transition-colors"
                        >
                            <Smile size={20} />
                        </button>

                        {/* Emoji Picker Popover */}
                        {showEmojiPicker && (
                            <div className="absolute bottom-full right-0 mb-4 z-50 shadow-2xl rounded-2xl border border-gray-100">
                                <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)}></div>
                                <div className="relative z-50">
                                    <EmojiPicker
                                        onEmojiClick={onEmojiClick}
                                        width={300}
                                        height={400}
                                        lazyLoadEmojis={true}
                                        previewConfig={{ showPreview: false }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={sending || !newMessage.trim() || isClosed}
                        className={`p-3.5 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg shadow-blue-500/20 ${sending || !newMessage.trim() || isClosed
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95'
                            }`}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatInput;
