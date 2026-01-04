'use client';
import FloatingCopilot from "@/components/AICopilot/FloatingCopilot";

import { useAuth } from '@/lib/auth-context';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { agentAPI } from '@/lib/api';
import { SupportTicket, TicketMessage } from '@/lib/supabase';
import { useTicketRealtime } from '@/lib/useRealtime';
import { useMessageNotification } from '@/lib/useNotificationSound';
import { ChatContainer, ChatInput } from '@/components/ChatUI';
import { ArrowLeft, CheckCircle } from 'lucide-react';
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

export default function AgentTicketDetail() {
  const { user, isLoading } = useAuth();
  const params = useParams();
  const ticketId = parseInt(params.id as string);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);

  // Notification sound for new messages
  useMessageNotification(messages, user?.id, 'agent');

  // Scroll to bottom only when new messages arrive (not on every poll)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  // Memoized load functions
  const loadTicket = useCallback(async () => {
    if (!user?.id || !ticketId) return;
    try {
      const ticketData = await agentAPI.getTicketDetails(ticketId, user.id);
      setTicket(ticketData);
    } catch (err) {
      console.error('Error loading ticket:', err);
    }
  }, [user?.id, ticketId]);

  const loadMessages = useCallback(async () => {
    if (!user?.id || !ticketId) return;
    try {
      console.log('[Chat] Loading messages for ticket:', ticketId);
      const messagesData = await agentAPI.getTicketMessages(ticketId, user.id);
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
    } else if (!isLoading && user?.role !== 'agent') {
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
      await agentAPI.addMessage(ticketId, user!.id, newMessage);
      setNewMessage('');
      loadTicketData();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (statusId: number) => {
    try {
      await agentAPI.updateTicketStatus(ticketId, user!.id, statusId);
      loadTicketData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleResolve = async () => {
    await handleStatusChange(5); // Resolved
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
          <p className="text-gray-500 mb-4">Ticket not found or you don't have access</p>
          <button onClick={() => window.history.back()} className="text-green-600 hover:text-green-700">
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
      <header className="bg-green-600 text-white shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-green-200 hover:text-white mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-green-200">#{ticket.ticket_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[statusName]}`}>
                  {statusName}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[priorityName]}`}>
                  {priorityName}
                </span>
              </div>
              <h1 className="text-xl font-bold">{ticket.subject}</h1>
            </div>
            {!isClosed && (
              <button
                onClick={handleResolve}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-400 px-4 py-2 rounded-lg text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Mark Resolved
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Ticket Info */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Contact</p>
              <p className="font-medium">{(ticket.contact as any)?.full_name}</p>
              <p className="text-gray-400">{(ticket.contact as any)?.phone}</p>
            </div>
            <div>
              <p className="text-gray-500">Organization</p>
              <p className="font-medium">{(ticket.organization as any)?.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Created</p>
              <p className="font-medium">{format(new Date(ticket.created_at), 'MMM d, yyyy')}</p>
              <p className="text-gray-400">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</p>
            </div>
            <div>
              <p className="text-gray-500">Update Status</p>
              <select
                value={ticket.status_id}
                onChange={(e) => handleStatusChange(parseInt(e.target.value))}
                disabled={isClosed}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm disabled:bg-gray-100"
              >
                <option value={1}>Open</option>
                <option value={2}>In Progress</option>
                <option value={3}>Awaiting Customer</option>
                <option value={4}>Escalated</option>
                <option value={5}>Resolved</option>
                <option value={6}>Closed</option>
              </select>
            </div>
          </div>
          {ticket.description && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-gray-500 text-sm mb-1">Description</p>
              <p className="text-gray-700">{ticket.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Conversation</h3>
          <ChatContainer
            messages={messages}
            currentUserId={user.id}
            userRole="agent"
            messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
            emptyMessage="No messages yet. Start the conversation below."
          />
        </div>
      </div>

      {/* Message Input */}
      {!isClosed && (
        <div className="bg-white border-t border-gray-200 shrink-0 shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <ChatInput
              value={newMessage}
              onChange={setNewMessage}
              onSend={handleSendMessage}
              sending={sending}
              placeholder="Type your response..."
              accentColor="green"
            />
          </div>
        </div>
      )}

      {isClosed && (
        <div className="bg-gray-100 border-t border-gray-200 shrink-0">
          <div className="max-w-5xl mx-auto px-4 py-4 text-center text-gray-500">
            This ticket is {statusName.toLowerCase()}.
          </div>
        </div>
      )}

      {/* Floating AI Copilot */}
      <FloatingCopilot ticketId={String(ticketId)} />
    </div>
  );
}
