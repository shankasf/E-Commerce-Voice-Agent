'use client';

import { useAuth } from '@/lib/auth-context';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { adminAPI } from '@/lib/api';
import { SupportTicket, TicketMessage, SupportAgent } from '@/lib/supabase';
import { useTicketRealtime } from '@/lib/useRealtime';
import { useMessageNotification } from '@/lib/useNotificationSound';
import { ChatContainer } from '@/components/ChatUI';
import { Terminal } from '@/components/Terminal';
import { ArrowLeft, User, UserPlus, Bot, Sparkles, AlertTriangle, Terminal as TerminalIcon } from 'lucide-react';
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

export default function AdminTicketDetail() {
  const { user, isLoading } = useAuth();
  const params = useParams();
  const ticketId = parseInt(params.id as string);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [assigningAI, setAssigningAI] = useState(false);
  const [aiAssigned, setAiAssigned] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalMinimized, setTerminalMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);

  // Notification sound for new messages
  useMessageNotification(messages, user?.id, 'admin');

  // Scroll to bottom only when new messages arrive (not on every poll)
  // Also detect terminal commands and auto-open terminal
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    // Check if latest message contains terminal commands or OPEN_TERMINAL marker
    if (messages.length > 0) {
      const latestMsg = messages[messages.length - 1];
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

  // Check if AI bot is assigned
  useEffect(() => {
    if (ticketId) {
      adminAPI.getAIBotStatus(ticketId).then(status => {
        setAiAssigned(status.hasAIBot);
      });
    }
  }, [ticketId, messages]);

  // Memoized load functions
  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const ticketData = await adminAPI.getTicketDetails(ticketId);
      setTicket(ticketData);
    } catch (err) {
      console.error('Error loading ticket:', err);
    }
  }, [ticketId]);

  const loadMessages = useCallback(async () => {
    if (!ticketId) return;
    try {
      console.log('[Chat] Loading messages for ticket:', ticketId);
      const messagesData = await adminAPI.getTicketMessages(ticketId);
      setMessages(messagesData);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  }, [ticketId]);

  const loadTicketData = useCallback(async () => {
    try {
      setLoading(true);
      const [ticketData, messagesData, agentsData] = await Promise.all([
        adminAPI.getTicketDetails(ticketId),
        adminAPI.getTicketMessages(ticketId),
        adminAPI.getAgents(),
      ]);
      setTicket(ticketData);
      setMessages(messagesData);
      setAgents(agentsData.filter(a => a.agent_type === 'Human'));
    } catch (err) {
      console.error('Error loading ticket:', err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Real-time WebSocket subscription for chat
  useTicketRealtime(ticketId, loadTicket, loadMessages);

  // Polling fallback for chat - every 10 seconds (reduced frequency to prevent flickering)
  useEffect(() => {
    if (!ticketId) return;

    const pollInterval = setInterval(() => {
      console.log('[Polling] Refreshing messages...');
      loadMessages();
    }, 10000); // Increased from 3s to 10s to reduce flickering

    return () => clearInterval(pollInterval);
  }, [ticketId]); // Removed loadMessages from dependencies to prevent constant re-creation

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/';
    } else if (!isLoading && user?.role !== 'admin') {
      window.location.href = `/dashboard/${user?.role}`;
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (user && ticketId) {
      loadTicketData();
    }
  }, [user, ticketId, loadTicketData]);

  const handleStatusChange = async (statusId: number) => {
    try {
      await adminAPI.updateTicketStatus(ticketId, statusId);
      loadTicketData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleAssign = async () => {
    if (!selectedAgent) return;
    try {
      await adminAPI.assignTicket(ticketId, selectedAgent);
      setShowAssign(false);
      setSelectedAgent(null);
      loadTicketData();
    } catch (err) {
      console.error('Error assigning ticket:', err);
    }
  };

  const handleAssignAIBot = async () => {
    setAssigningAI(true);
    try {
      const result = await adminAPI.assignAIBot(ticketId);
      if (result.success) {
        setAiAssigned(true);
        setShowAssign(false);
        loadTicketData();
      } else {
        console.error('Failed to assign AI bot:', result.error);
        alert('Failed to assign AI bot: ' + result.error);
      }
    } catch (err) {
      console.error('Error assigning AI bot:', err);
    } finally {
      setAssigningAI(false);
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
          <p className="text-slate-400 mb-4">Ticket not found</p>
          <button onClick={() => window.history.back()} className="text-purple-600 hover:text-purple-700">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const statusName = (ticket.status as any)?.name || 'Unknown';
  const priorityName = (ticket.priority as any)?.name || 'Medium';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">

      {/* Header - Enhanced */}
      <header className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white shrink-0 border-b-2 border-purple-800/40" style={{ boxShadow: 'none' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2.5 text-purple-100 hover:text-white mb-6 transition-colors group font-medium"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to dashboard</span>
          </button>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-xs font-mono font-bold text-purple-200 bg-white/10 px-3 py-1.5 rounded-lg">#{ticket.ticket_id}</span>
                <span className={`badge ${statusColors[statusName] || 'badge-gray'}`}>
                  {statusName}
                </span>
                <span className={`badge ${priorityColors[priorityName] || 'badge-gray'}`}>
                  {priorityName}
                </span>
                {aiAssigned && (
                  <span className="badge badge-purple flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" />
                    AI Bot Assigned
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{ticket.subject}</h1>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowAssign(true)}
                className="btn bg-white/20 hover:bg-white/30 text-white border-2 border-white/30 shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                <span className="hidden sm:inline">Assign</span>
              </button>
            </div>
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
              <p className="text-slate-400 text-xs mt-0.5">{(ticket.contact as any)?.email}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">Organization</p>
              <p className="font-semibold text-slate-100">{(ticket.organization as any)?.name}</p>
              <p className="text-slate-400 text-xs mt-0.5">U&E: {(ticket.organization as any)?.u_e_code}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">Created</p>
              <p className="font-semibold text-slate-100">{format(new Date(ticket.created_at), 'MMM d, yyyy')}</p>
              <p className="text-slate-400 text-xs mt-0.5">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium mb-1">Status</p>
              <select
                value={ticket.status_id}
                onChange={(e) => handleStatusChange(parseInt(e.target.value))}
                className="input text-sm py-2"
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
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-1">Conversation History</h3>
              <div className="h-1 w-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"></div>
            </div>
            <button
              onClick={() => {
                setShowTerminal(!showTerminal);
                setTerminalMinimized(false);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium border ${
                showTerminal
                  ? 'bg-purple-600/50 border-purple-500/50 text-purple-200 hover:bg-purple-600/70'
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
                userRole="admin"
                isMinimized={terminalMinimized}
                onMinimize={setTerminalMinimized}
                messages={messages}
              />
            </div>
          )}

          <div>
            <ChatContainer
              messages={messages}
              currentUserId={user.id}
              userRole="admin"
              messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
              emptyMessage="No messages yet."
            />
          </div>
        </div>
      </div>

      {/* Assign Modal - Enhanced */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl mx-4 animate-scale-in">
            <div className="surface-elevated rounded-2xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-slate-100">Assign Ticket</h3>
                <button
                  onClick={() => {
                    setShowAssign(false);
                    setSelectedAgent(null);
                  }}
                  className="btn btn-ghost p-2 hover:bg-red-900/50 hover:text-red-300"
                  title="Close"
                >
                  <AlertTriangle className="w-6 h-6 rotate-45" />
                </button>
              </div>

            {/* AI Bot Option - Dark Theme */}
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-300 mb-2">🤖 AI-Powered Resolution</p>
              <button
                onClick={handleAssignAIBot}
                disabled={assigningAI || aiAssigned}
                className={`w-full p-4 rounded-lg border text-left flex items-center gap-3 transition-all ${aiAssigned
                  ? 'border-green-500/50 bg-green-600/20'
                  : 'border-purple-500/50 bg-purple-600/20 hover:border-purple-500/70'
                  } disabled:opacity-50`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                  {assigningAI ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-100">
                    {aiAssigned ? 'AI Bot Already Assigned' : 'Assign AI Support Bot'}
                  </p>
                  <p className="text-sm text-slate-300">
                    {aiAssigned
                      ? 'The AI bot is handling this ticket automatically'
                      : 'Multi-agent AI will analyze and resolve the issue with step-by-step guidance'
                    }
                  </p>
                </div>
                {aiAssigned && (
                  <span className="text-xs bg-green-600/20 border border-green-500/50 text-green-300 px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </button>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI will auto-categorize, provide solutions, and close when resolved
              </p>
            </div>

            <div className="border-t border-slate-700/50 pt-4 mb-2">
              <p className="text-sm font-medium text-slate-300 mb-2">👤 Human Agents</p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {agents.map((agent) => (
                <button
                  key={agent.support_agent_id}
                  onClick={() => setSelectedAgent(agent.support_agent_id)}
                  className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 ${selectedAgent === agent.support_agent_id
                    ? 'border-purple-500/50 bg-purple-600/20'
                    : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/50'
                    }`}
                >
                  <div className="w-10 h-10 bg-green-600/20 border border-green-500/50 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-100">{agent.full_name}</p>
                    <p className="text-sm text-slate-300">{agent.specialization || 'General Support'}</p>
                  </div>
                  {agent.is_available && (
                    <span className="text-xs bg-green-600/20 border border-green-500/50 text-green-300 px-2 py-1 rounded-full">
                      Available
                    </span>
                  )}
                </button>
              ))}
              {agents.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No human agents available</p>
              )}
            </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700/50">
                <button
                  onClick={() => {
                    setShowAssign(false);
                    setSelectedAgent(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedAgent}
                  className="btn btn-primary bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  Assign Human
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
