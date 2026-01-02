'use client';

import { useAuth } from '@/lib/auth-context';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { requesterAPI } from '@/lib/api';
import { SupportTicket, TicketMessage } from '@/lib/supabase';
import { useTicketRealtime } from '@/lib/useRealtime';
import { useMessageNotification } from '@/lib/useNotificationSound';
import { ChatContainer, ChatInput } from '@/components/ChatUI';
import { ArrowLeft } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const priorityColors: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  Open: 'bg-yellow-100 text-yellow-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Awaiting Customer': 'bg-purple-100 text-purple-700',
  Escalated: 'bg-orange-100 text-orange-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-700',
};

export default function RequesterTicketDetail() {
  const { user, isLoading } = useAuth();
  const params = useParams();
  const ticketId = parseInt(params.id as string);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);

  // Notification sound for new messages
  useMessageNotification(messages, user?.id, 'requester');

  // Scroll to bottom only when new messages arrive (not on every poll)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

      // Stop AI thinking indicator when any agent (bot or human) responds
      const latestMsg = messages[messages.length - 1];
      if (latestMsg && latestMsg.sender_agent_id) {
        setAiThinking(false);
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  // Memoized load functions
  const loadTicket = useCallback(async () => {
    if (!user?.id || !ticketId) return;
    try {
      const ticketData = await requesterAPI.getTicketDetails(ticketId, user.id);
      setTicket(ticketData);
    } catch (err) {
      console.error('Error loading ticket:', err);
    }
  }, [user?.id, ticketId]);

  const loadMessages = useCallback(async () => {
    if (!user?.id || !ticketId) return;
    try {
      console.log('[Chat] Loading messages for ticket:', ticketId);
      const messagesData = await requesterAPI.getTicketMessages(ticketId, user.id);
      setMessages(messagesData);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  }, [user?.id, ticketId]);

  const loadTicketData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadTicket(), loadMessages()]);
    } finally {
      setLoading(false);
    }
  }, [loadTicket, loadMessages]);

  // Real-time WebSocket subscription for chat
  useTicketRealtime(ticketId, loadTicket, loadMessages);

  // Polling fallback for chat - every 3 seconds for responsive chat
  useEffect(() => {
    if (!user?.id || !ticketId) return;

    const pollInterval = setInterval(() => {
      console.log('[Polling] Refreshing messages...');
      loadMessages();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [user?.id, ticketId, loadMessages]);

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/';
    } else if (!isLoading && user?.role !== 'requester') {
      window.location.href = `/dashboard/${user?.role}`;
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (user?.id && ticketId) {
      loadTicketData();
    }
  }, [user, ticketId, loadTicketData]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      // Only show AI thinking if ticket is NOT handled by human agent
      if (!ticket?.requires_human_agent) {
        setAiThinking(true);
      }
      await requesterAPI.addMessage(ticketId, user!.id, newMessage);
      setNewMessage('');
      loadTicketData();
    } catch (err) {
      console.error('Error sending message:', err);
      setAiThinking(false); // Hide on error
    } finally {
      setSending(false);
    }
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading ticket...</div>;
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Ticket not found or access denied</p>
          <button onClick={() => window.history.back()} className="text-blue-600 hover:text-blue-700">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const statusName = (ticket.status as any)?.name || 'Unknown';
  const priorityName = (ticket.priority as any)?.name || 'Medium';
  const isClosed = ['Resolved', 'Closed'].includes(statusName);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to tickets
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-500">#{ticket.ticket_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[statusName]}`}>
                  {statusName}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[priorityName]}`}>
                  {priorityName}
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{ticket.subject}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Description */}
      {ticket.description && (
        <div className="bg-white border-b border-gray-200 shrink-0">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
            <p className="text-gray-700">{ticket.description}</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Conversation</h3>
          <ChatContainer
            messages={messages}
            currentUserId={user.id}
            userRole="requester"
            messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
            emptyMessage="No messages yet. Start the conversation below."
            aiThinking={aiThinking}
          />
        </div>
      </div>

      {/* Message Input */}
      {!isClosed && (
        <div className="bg-white border-t border-gray-200 shrink-0 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <ChatInput
              value={newMessage}
              onChange={setNewMessage}
              onSend={handleSendMessage}
              sending={sending}
              placeholder="Type your message..."
              accentColor="blue"
            />
          </div>
        </div>
      )}

      {isClosed && (
        <div className="bg-gray-100 border-t border-gray-200 shrink-0">
          <div className="max-w-4xl mx-auto px-4 py-4 text-center text-gray-500">
            This ticket is {statusName.toLowerCase()}. You cannot add new messages.
          </div>
        </div>
      )}
    </div>
  );
}
