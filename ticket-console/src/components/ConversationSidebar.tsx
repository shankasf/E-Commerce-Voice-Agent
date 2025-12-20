'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Conversation } from '@/lib/conversationService';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleDelete = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      onDeleteConversation(conversationId);
      if (conversationId === currentConversationId) {
        onNewConversation();
      }
    }
  };

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 overflow-hidden ${
      isExpanded ? 'w-80' : 'w-16'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        {isExpanded && <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* New Conversation Button */}
          <button
            onClick={onNewConversation}
            className="mx-4 mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">Start a new conversation to get help</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all group border ${
                    conv.id === currentConversationId
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${
                        conv.id === currentConversationId ? 'text-green-700' : 'text-gray-900'
                      }`}>
                        {conv.title || 'Untitled'}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>
                          {new Date(conv.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {conv.ticketId && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                            #{conv.ticketId}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

