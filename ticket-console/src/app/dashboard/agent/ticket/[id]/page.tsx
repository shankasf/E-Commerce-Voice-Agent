'use client';

import { useAuth } from '@/lib/auth-context';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { agentAPI } from '@/lib/api';
import { SupportTicket, TicketMessage } from '@/lib/supabase';
import { useTicketRealtime } from '@/lib/useRealtime';
import { useMessageNotification } from '@/lib/useNotificationSound';
import { ChatContainer, ChatInput } from '@/components/ChatUI';
import { Terminal } from '@/components/Terminal';
import { ArrowLeft, CheckCircle, Terminal as TerminalIcon } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const priorityColors: Record<string, string> = {
  Low: 'badge-gray',
  Medium: 'badge-blue',
  High: 'badge-yellow',
  Critical: 'badge-red',
};

const statusColors: Record<string, string> = {
  Open: 'badge-yellow',
  'In Progress': 'badge-blue',
  'Awaiting Customer': 'badge-purple',
  Escalated: 'badge-yellow',
  Resolved: 'badge-green',
  Closed: 'badge-gray',
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
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalMinimized, setTerminalMinimized] = useState(false);
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

  // Polling fallback for chat - every 10 seconds (reduced frequency to prevent flickering)
  useEffect(() => {
    if (!user?.id || !ticketId) return;

    const pollInterval = setInterval(() => {
      console.log('[Polling] Refreshing messages...');
      loadMessages();
    }, 10000); // Increased from 3s to 10s to reduce flickering

    return () => clearInterval(pollInterval);
  }, [user?.id, ticketId]); // Removed loadMessages from dependencies to prevent constant re-creation

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
      // Only reload messages, not the entire ticket (prevents loading screen)
      loadMessages();
      // Also reload ticket to get updated status, but don't show loading screen
      loadTicket();
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
          <p className="text-slate-400 mb-4">Ticket not found or you don't have access</p>
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
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 text-white shrink-0 border-b-2 border-green-800/40" style={{ boxShadow: 'none' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2.5 text-green-100 hover:text-white mb-6 transition-colors group font-medium"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to dashboard</span>
          </button>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-xs font-mono font-bold text-green-200 bg-white/10 px-3 py-1.5 rounded-lg">#{ticket.ticket_id}</span>
                <span className={`badge ${statusColors[statusName] || 'badge-gray'}`}>
                  {statusName}
                </span>
                <span className={`badge ${priorityColors[priorityName] || 'badge-gray'}`}>
                  {priorityName}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
            </div>
            {!isClosed && (
              <button
                onClick={handleResolve}
                className="btn bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm shadow-lg"
              >
                <CheckCircle className="w-5 h-5" />
                Mark Resolved
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Ticket Info - Dark Theme */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400 font-medium mb-1">Contact</p>
              <p className="font-semibold text-slate-100">{(ticket.contact as any)?.full_name}</p>
              <p className="text-slate-400 text-xs mt-0.5">{(ticket.contact as any)?.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">Organization</p>
              <p className="font-semibold text-slate-100">{(ticket.organization as any)?.name}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">Created</p>
              <p className="font-semibold text-slate-100">{format(new Date(ticket.created_at), 'MMM d, yyyy')}</p>
              <p className="text-slate-400 text-xs mt-0.5">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">Update Status</p>
              <select
                value={ticket.status_id}
                onChange={(e) => handleStatusChange(parseInt(e.target.value))}
                disabled={isClosed}
                className="input text-sm py-2 disabled:bg-slate-800/30"
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
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Description</p>
              <p className="text-slate-200 leading-relaxed">{ticket.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages - Dark Theme */}
      <div className="flex-1 overflow-auto bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-1">Conversation</h3>
              <div className="h-1 w-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
            </div>
            <button
              onClick={() => {
                setShowTerminal(!showTerminal);
                setTerminalMinimized(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium border ${
                showTerminal
                  ? 'bg-green-600/50 border-green-500/50 text-green-200 hover:bg-green-600/70'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              <TerminalIcon className="w-4 h-4" />
              {showTerminal ? 'Hide Terminal' : 'Open Terminal'}
            </button>
          </div>
          
          {/* Terminal Panel */}
          {showTerminal && (
            <div className="mb-6">
              <Terminal
                ticketId={ticketId}
                userId={user.id}
                userRole="agent"
                isMinimized={terminalMinimized}
                onMinimize={setTerminalMinimized}
              />
            </div>
          )}

          <div>
            <ChatContainer
              messages={messages}
              currentUserId={user.id}
              userRole="agent"
              messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
              emptyMessage="No messages yet. Start the conversation below."
            />
          </div>
        </div>
      </div>

      {/* Message Input - Dark Theme */}
      {!isClosed && (
        <div className="bg-slate-900 border-t border-slate-700/50 shrink-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
        <div className="bg-slate-900 border-t border-slate-700/50 shrink-0 z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl">
              <CheckCircle className="w-5 h-5 text-slate-400" />
              <p className="text-slate-300 font-semibold">This ticket is {statusName.toLowerCase()}. You cannot add new messages.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
