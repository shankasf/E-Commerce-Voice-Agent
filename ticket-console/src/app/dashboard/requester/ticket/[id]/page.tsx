'use client';

import { useAuth } from '@/lib/auth-context';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { requesterAPI } from '@/lib/api';
import { SupportTicket, TicketMessage } from '@/lib/supabase';
import { useTicketRealtime } from '@/lib/useRealtime';
import { useMessageNotification } from '@/lib/useNotificationSound';
import { ChatContainer, ChatInput } from '@/components/ChatUI';
import { Terminal } from '@/components/Terminal';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle, Terminal as TerminalIcon, X } from 'lucide-react';
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
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalMinimized, setTerminalMinimized] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);
  const terminalComponentRef = useRef<any>(null);

  // Notification sound for new messages
  useMessageNotification(messages, user?.id, 'requester');

  // Scroll to bottom only when new messages arrive (not on every poll)
  // Also detect terminal commands and auto-open terminal
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

      // Stop AI thinking indicator when any agent (bot or human) responds
      const latestMsg = messages[messages.length - 1];
      if (latestMsg && latestMsg.sender_agent_id) {
        setAiThinking(false);
      }

      // Check if latest message contains terminal commands or OPEN_TERMINAL marker
      if (latestMsg && latestMsg.content) {
        const content = latestMsg.content;
        
        // Auto-open terminal if agent requests it
        if (content.includes('<OPEN_TERMINAL>true</OPEN_TERMINAL>') || content.includes('<TERMINAL_COMMAND>')) {
          if (!showTerminal) {
            console.log('[Terminal] Auto-opening terminal due to agent request');
            setShowTerminal(true);
            setTerminalMinimized(false);
          }
        }
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, showTerminal]);

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
        // Set a timeout to clear thinking state after 30 seconds if no response
        setTimeout(() => {
          setAiThinking(false);
        }, 30000);
      }
      await requesterAPI.addMessage(ticketId, user!.id, newMessage);
      setNewMessage('');
      // Only reload messages, not the entire ticket (prevents loading screen)
      loadMessages();
      // Also reload ticket to get updated status, but don't show loading screen
      loadTicket();
      
      // Clear thinking state after a short delay to allow AI response to appear
      // The polling will update the messages and clear the thinking state
      setTimeout(() => {
        setAiThinking(false);
      }, 5000);
    } catch (err) {
      console.error('Error sending message:', err);
      setAiThinking(false); // Hide on error
    } finally {
      setSending(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-layered flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl animate-pulse shadow-2xl glow-blue"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-slate-700 font-semibold text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-layered flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl animate-pulse shadow-2xl glow-blue"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-slate-700 font-semibold text-lg">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-layered flex items-center justify-center p-4">
        <div className="surface-elevated p-12 text-center max-w-md animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-3">Ticket Not Found</h2>
          <p className="text-slate-300 mb-8 font-medium">This ticket doesn't exist or you don't have access to it.</p>
          <button onClick={() => window.history.back()} className="btn btn-primary">
            <ArrowLeft className="w-5 h-5" />
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
    <div className="min-h-screen bg-slate-900 flex flex-col relative">

      {/* Terminal Section - Fixed Position on Right Side - Seamlessly Integrated with left border */}
      {showTerminal && (
        <div 
          className="fixed right-0 w-[50%] min-w-[500px] flex flex-col bg-slate-900 z-50 top-0 bottom-0 border-l-2 border-slate-700" 
          style={{ 
            height: '100vh'
          }}
        >
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide">Local Terminal</h3>
                <p className="text-xs text-slate-400">Your local terminal - AI agent has direct access</p>
              </div>
              <button
                onClick={() => setShowTerminal(false)}
                className="p-1.5 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/50 bg-slate-800/50"
                title="Close Terminal"
                style={{ borderRadius: 0 }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden" style={{ minHeight: 0, height: '100%' }}>
            <Terminal
              ticketId={ticketId}
              userId={user.id}
              userRole="requester"
              isMinimized={terminalMinimized}
              onMinimize={setTerminalMinimized}
              messages={messages}
            />
          </div>
        </div>
      )}

      {/* Header - Dark Theme, Squeezes when terminal is open */}
      <header className={`bg-slate-900 border-b border-slate-700 shrink-0 transition-all ${showTerminal ? 'mr-[50%]' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2.5 text-slate-300 hover:text-slate-100 mb-6 transition-colors group font-medium px-3 py-2 border border-slate-700/50 bg-slate-800/50 hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to tickets</span>
          </button>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/50 border border-slate-700/50 px-3 py-1.5 rounded-lg">#{ticket.ticket_id}</span>
                <span className={`badge ${statusColors[statusName] || 'badge-gray'} bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-lg`}>
                  {statusName}
                </span>
                <span className={`badge ${priorityColors[priorityName] || 'badge-gray'} bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-lg`}>
                  {priorityName}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-100 mb-3 leading-tight">{ticket.subject}</h1>
              <div className="flex items-center gap-4 text-sm text-slate-400 font-medium">
                <span>Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                {ticket.closed_at && (
                  <span className="text-slate-500">• Closed {formatDistanceToNow(new Date(ticket.closed_at), { addSuffix: true })}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Description - Dark Theme, Squeezes when terminal is open */}
      {ticket.description && (
        <div className={`bg-slate-900 border-b border-slate-700 shrink-0 transition-all ${showTerminal ? 'mr-[50%]' : ''}`}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Initial Description</h3>
            <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-xl">
              <p className="text-slate-300 leading-relaxed font-medium">{ticket.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Section - Dark Theme, Scrollable, with right padding when terminal is open */}
      <div className={`flex-1 flex flex-col bg-slate-900 ${showTerminal ? 'mr-[50%]' : ''} transition-all`}>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-1">Conversation</h3>
              <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            </div>
            <button
              onClick={() => {
                setShowTerminal(!showTerminal);
                setTerminalMinimized(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 transition-colors font-medium border rounded-lg ${
                showTerminal
                  ? 'bg-blue-600/50 border-blue-500/50 text-blue-200 hover:bg-blue-600/70'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              <TerminalIcon className="w-4 h-4" />
              {showTerminal ? 'Hide Terminal' : 'Open Terminal'}
            </button>
          </div>
          
          <div className="max-w-4xl mx-auto">
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

        {/* Message Input - Dark Theme */}
        {!isClosed && (
          <div className="bg-slate-900 border-t border-slate-700 shrink-0">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <ChatInput
                value={newMessage}
                onChange={setNewMessage}
                onSend={handleSendMessage}
                sending={sending}
                placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                accentColor="blue"
              />
            </div>
          </div>
        )}

        {isClosed && (
          <div className="bg-slate-900 border-t border-slate-700 shrink-0">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                <CheckCircle className="w-5 h-5 text-slate-400" />
                <p className="text-slate-300 font-semibold">This ticket is {statusName.toLowerCase()}. You cannot add new messages.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
