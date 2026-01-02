'use client';

import { useAuth } from '@/lib/auth-context';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { adminAPI } from '@/lib/api';
import { SupportTicket, TicketMessage, SupportAgent } from '@/lib/supabase';
import { useTicketRealtime } from '@/lib/useRealtime';
import { useMessageNotification } from '@/lib/useNotificationSound';
import { ChatContainer } from '@/components/ChatUI';
import { ArrowLeft, User, UserPlus, Bot, Sparkles, AlertTriangle } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);

  // Notification sound for new messages
  useMessageNotification(messages, user?.id, 'admin');

  // Scroll to bottom only when new messages arrive (not on every poll)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

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

  // Polling fallback for chat - every 3 seconds for responsive chat
  useEffect(() => {
    if (!ticketId) return;

    const pollInterval = setInterval(() => {
      console.log('[Polling] Refreshing messages...');
      loadMessages();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [ticketId, loadMessages]);

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
          <p className="text-gray-500 mb-4">Ticket not found</p>
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-purple-600 text-white shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-purple-200 hover:text-white mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-purple-200">#{ticket.ticket_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[statusName]}`}>
                  {statusName}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[priorityName]}`}>
                  {priorityName}
                </span>
                {aiAssigned && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    AI Bot Assigned
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold">{ticket.subject}</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAssign(true)}
                className="flex items-center gap-2 bg-purple-500 hover:bg-purple-400 px-3 py-2 rounded-lg text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Assign
              </button>
            </div>
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
              <p className="text-gray-400">{(ticket.contact as any)?.email}</p>
            </div>
            <div>
              <p className="text-gray-500">Organization</p>
              <p className="font-medium">{(ticket.organization as any)?.name}</p>
              <p className="text-gray-400">U&E: {(ticket.organization as any)?.u_e_code}</p>
            </div>
            <div>
              <p className="text-gray-500">Created</p>
              <p className="font-medium">{format(new Date(ticket.created_at), 'MMM d, yyyy')}</p>
              <p className="text-gray-400">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <select
                value={ticket.status_id}
                onChange={(e) => handleStatusChange(parseInt(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
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
          <h3 className="text-sm font-medium text-gray-500 mb-4">Conversation History</h3>
          <ChatContainer
            messages={messages}
            currentUserId={user.id}
            userRole="admin"
            messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
            emptyMessage="No messages yet."
          />
        </div>
      </div>

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Assign Ticket</h3>

            {/* AI Bot Option */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-2">🤖 AI-Powered Resolution</p>
              <button
                onClick={handleAssignAIBot}
                disabled={assigningAI || aiAssigned}
                className={`w-full p-4 rounded-lg border text-left flex items-center gap-3 transition-all ${aiAssigned
                  ? 'border-green-500 bg-green-50'
                  : 'border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 hover:border-purple-500'
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
                  <p className="font-semibold text-gray-900">
                    {aiAssigned ? 'AI Bot Already Assigned' : 'Assign AI Support Bot'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {aiAssigned
                      ? 'The AI bot is handling this ticket automatically'
                      : 'Multi-agent AI will analyze and resolve the issue with step-by-step guidance'
                    }
                  </p>
                </div>
                {aiAssigned && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </button>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI will auto-categorize, provide solutions, and close when resolved
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4 mb-2">
              <p className="text-sm font-medium text-gray-600 mb-2">👤 Human Agents</p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {agents.map((agent) => (
                <button
                  key={agent.support_agent_id}
                  onClick={() => setSelectedAgent(agent.support_agent_id)}
                  className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 ${selectedAgent === agent.support_agent_id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{agent.full_name}</p>
                    <p className="text-sm text-gray-500">{agent.specialization || 'General Support'}</p>
                  </div>
                  {agent.is_available && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      Available
                    </span>
                  )}
                </button>
              ))}
              {agents.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No human agents available</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAssign(false);
                  setSelectedAgent(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedAgent}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Assign Human
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
