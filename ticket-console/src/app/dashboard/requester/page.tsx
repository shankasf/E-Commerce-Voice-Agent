'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useCallback } from 'react';
import { requesterAPI } from '@/lib/api';
import { SupportTicket } from '@/lib/supabase';
import { useRequesterTicketsRealtime } from '@/lib/useRealtime';
import {
  Ticket,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  LogOut,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Wifi,
  WifiOff,
  XCircle,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

export default function RequesterDashboard() {
  const { user, logout, isLoading } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 2 });
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Memoized load function for real-time updates
  const loadTickets = useCallback(async (contactId: number) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading tickets for contact:', contactId);
      const data = await requesterAPI.getMyTickets(contactId);
      console.log('Tickets loaded:', data.length, data);
      setTickets(data);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time subscription using WebSocket
  useRequesterTicketsRealtime(user?.id, () => {
    if (user?.id) {
      console.log('[Realtime] Ticket update received, refreshing...');
      loadTickets(user.id);
    }
  });

  // Polling fallback every 15 seconds
  useEffect(() => {
    if (!user?.id) return;

    const pollInterval = setInterval(() => {
      console.log('[Polling] Refreshing tickets...');
      loadTickets(user.id);
    }, 15000); // Increased to 15s to reduce flickering

    return () => clearInterval(pollInterval);
  }, [user?.id]); // Removed callback from dependencies to prevent constant re-creation

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      window.location.href = '/';
    } else if (mounted && !isLoading && user?.role !== 'requester') {
      window.location.href = `/dashboard/${user?.role}`;
    }
  }, [user, isLoading, mounted]);

  useEffect(() => {
    // Load tickets when user is available and auth is done loading
    if (mounted && !isLoading && user?.id) {
      loadTickets(user.id);
    }
  }, [user, isLoading, mounted, loadTickets]);

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!user?.id) {
      setError('User not logged in');
      return;
    }
    if (!user?.organization_id) {
      setError('Organization not found. Please log out and log in again.');
      return;
    }

    // Close modal immediately (optimistic UI)
    const ticketData = { ...newTicket };
    setShowNewTicket(false);
    setNewTicket({ subject: '', description: '', priority: 2 });
    setError(null);

    try {
      console.log('Creating ticket:', { contactId: user.id, orgId: user.organization_id, subject: ticketData.subject });
      const result = await requesterAPI.createTicket(
        user.id,
        user.organization_id,
        ticketData.subject,
        ticketData.description,
        ticketData.priority
      );
      console.log('Ticket created:', result);
      // Refresh tickets list in background
      loadTickets(user.id);
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      setError(err.message || 'Failed to create ticket');
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const navigateToTicket = (ticketId: number) => {
    window.location.href = `/dashboard/requester/ticket/${ticketId}`;
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const openCount = tickets.filter(t => (t.status as any)?.name === 'Open').length;
  const inProgressCount = tickets.filter(t => ['In Progress', 'Awaiting Customer'].includes((t.status as any)?.name)).length;
  const resolvedCount = tickets.filter(t => ['Resolved', 'Closed'].includes((t.status as any)?.name)).length;

  return (
    <div className="min-h-screen relative overflow-hidden bg-layered">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/6 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/6 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '3s' }}></div>
          </div>

      {/* Header - Dark Theme */}
      <header className="relative bg-slate-900/80 border-b border-slate-700/50 shadow-lg sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg glow-blue">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">My Support Tickets</h1>
              <p className="text-sm text-slate-300 mt-0.5 font-medium">Welcome back, <span className="font-semibold text-slate-100">{user.name}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => user?.id && loadTickets(user.id)}
              disabled={loading}
              className="btn btn-ghost p-3"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowNewTicket(true)}
              className="btn btn-primary"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Ticket</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-ghost p-3"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Error Alert - Dark Theme */}
        {error && (
          <div className="mb-8 bg-red-900/30 border border-red-700/50 rounded-xl p-5 border-l-4 border-red-500 text-red-200 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-900/50 border border-red-700/50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-300" />
              </div>
              <span className="font-semibold text-base">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-red-200 hover:bg-red-900/50 rounded-lg p-2 transition-all">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Stats - Dark Theme */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-xl p-7 group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-slate-100 mb-2">{openCount}</p>
                <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Open Tickets</p>
              </div>
              <div className="p-4 bg-yellow-600/20 border border-yellow-500/50 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </div>
          <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-xl p-7 group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-slate-100 mb-2">{inProgressCount}</p>
                <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">In Progress</p>
              </div>
              <div className="p-4 bg-blue-600/20 border border-blue-500/50 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>
          <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-xl p-7 group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-slate-100 mb-2">{resolvedCount}</p>
                <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Resolved</p>
              </div>
              <div className="p-4 bg-green-600/20 border border-green-500/50 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tickets List - Dark Theme */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="bg-slate-800/70 border-b border-slate-700/50 flex justify-between items-center p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">My Tickets</h2>
            </div>
            <span className="text-xs text-slate-300 font-mono bg-slate-800/50 border border-slate-700/50 px-2.5 py-1 rounded-lg">ID: {user.id}</span>
          </div>

          {error ? (
            <div className="p-16 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-red-900/30 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-red-900/50 border border-red-700/50 rounded-full flex items-center justify-center shadow-lg">
                  <AlertCircle className="w-10 h-10 text-red-300" />
                </div>
              </div>
              <p className="text-red-300 font-semibold text-lg mb-6">{error}</p>
              <button
                onClick={() => user?.id && loadTickets(user.id)}
                className="btn btn-primary"
              >
                <RefreshCw className="w-5 h-5" />
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="p-16 text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 bg-blue-900/30 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-blue-900/50 border border-blue-700/50 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              </div>
              <p className="text-slate-300 font-semibold">Loading tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-16 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-slate-800/50 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-slate-800/70 border border-slate-700/50 rounded-full flex items-center justify-center shadow-lg">
                  <Ticket className="w-12 h-12 text-slate-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">No tickets yet</h3>
              <p className="text-slate-300 font-medium mb-8 max-w-md mx-auto">Get started by creating your first support ticket. Our AI assistant is ready to help you!</p>
              <button
                onClick={() => setShowNewTicket(true)}
                className="btn btn-primary text-base py-3.5 px-6"
              >
                <Plus className="w-5 h-5" />
                Create your first ticket
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {tickets.map((ticket, index) => (
                <div
                  key={ticket.ticket_id}
                  onClick={() => navigateToTicket(ticket.ticket_id)}
                  className="p-6 hover:bg-slate-800/70 cursor-pointer transition-all duration-300 group border-l-4 border-transparent hover:border-blue-500/50"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="text-xs font-mono text-slate-300 font-bold bg-slate-800/50 border border-slate-700/50 px-2.5 py-1 rounded-lg">#{ticket.ticket_id}</span>
                        <span className={`badge ${statusColors[(ticket.status as any)?.name] || 'badge-gray'} bg-slate-800/50 border border-slate-700/50 text-slate-200`}>
                        {(ticket.status as any)?.name}
                      </span>
                        <span className={`badge ${priorityColors[(ticket.priority as any)?.name] || 'badge-gray'} bg-slate-800/50 border border-slate-700/50 text-slate-200`}>
                        {(ticket.priority as any)?.name}
                      </span>
                      </div>
                      <p className="font-bold text-lg text-slate-100 mb-2 group-hover:text-blue-400 transition-colors leading-tight">{ticket.subject}</p>
                      <p className="text-sm text-slate-400 font-medium">
                        Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-2 transition-all duration-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Ticket Modal - Enhanced */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl mx-4 animate-scale-in">
            <div className="surface-elevated overflow-hidden shadow-2xl">
              {/* Modal Header - Dark Theme */}
              <div className="relative bg-slate-800/70 border-b border-slate-700/50 flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg glow-blue">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-100">Create New Ticket</h3>
                </div>
                <button
                  onClick={() => setShowNewTicket(false)}
                  className="btn btn-ghost p-2 hover:bg-red-900/50 hover:text-red-300 transition-colors"
                  title="Close"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              {/* Modal Body - Dark Theme */}
              <div className="space-y-6 p-8 bg-slate-900/50">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">
                    Subject <span className="text-red-400">*</span>
                  </label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    className="input text-base py-4"
                  placeholder="Brief description of your issue"
                    autoFocus
                />
              </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">
                    Description
                  </label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    rows={6}
                    className="input resize-none text-base py-4 leading-relaxed"
                    placeholder="Provide detailed information about the issue you're experiencing. Include any error messages, steps to reproduce, and what you were doing when the issue occurred..."
                />
              </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-300 uppercase tracking-wide mb-3">
                    Priority Level
                  </label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: parseInt(e.target.value) })}
                    className="input text-base py-4"
                >
                    <option value={1}>🟢 Low - General inquiry or non-urgent request</option>
                    <option value={2}>🔵 Medium - Standard issue affecting productivity</option>
                    <option value={3}>🟠 High - Urgent issue impacting work</option>
                    <option value={4}>🔴 Critical - System down or business-critical issue</option>
                </select>
              </div>
            </div>
              
              {/* Modal Footer - Dark Theme */}
              <div className="bg-slate-800/70 border-t border-slate-700/50 flex justify-end gap-4 p-6">
              <button
                onClick={() => setShowNewTicket(false)}
                  className="btn btn-secondary px-6"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                  className="btn btn-primary px-8"
                  disabled={!newTicket.subject.trim()}
              >
                  <Plus className="w-5 h-5" />
                Create Ticket
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
