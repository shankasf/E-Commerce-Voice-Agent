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
  WifiOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

  // Polling fallback every 10 seconds
  useEffect(() => {
    if (!user?.id) return;

    const pollInterval = setInterval(() => {
      console.log('[Polling] Refreshing tickets...');
      loadTickets(user.id);
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [user?.id, loadTickets]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      window.location.href = '/tms';
    } else if (mounted && !isLoading && user?.role !== 'requester') {
      window.location.href = `/tms/dashboard/${user?.role}`;
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
    window.location.href = `/tms/dashboard/requester/ticket/${ticketId}`;
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const openCount = tickets.filter(t => (t.status as any)?.name === 'Open').length;
  const inProgressCount = tickets.filter(t => ['In Progress', 'Awaiting Customer'].includes((t.status as any)?.name)).length;
  const resolvedCount = tickets.filter(t => ['Resolved', 'Closed'].includes((t.status as any)?.name)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Support Tickets</h1>
            <p className="text-sm text-gray-500">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => user?.id && loadTickets(user.id)}
              disabled={loading}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowNewTicket(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Ticket
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{openCount}</p>
                <p className="text-sm text-gray-500">Open</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{resolvedCount}</p>
                <p className="text-sm text-gray-500">Resolved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">My Tickets</h2>
            <span className="text-xs text-gray-400">User ID: {user.id}</span>
          </div>

          {error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
              <p className="text-red-500">{error}</p>
              <button
                onClick={() => user?.id && loadTickets(user.id)}
                className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-gray-500">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center">
              <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No tickets yet</p>
              <button
                onClick={() => setShowNewTicket(true)}
                className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first ticket
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <div
                  key={ticket.ticket_id}
                  onClick={() => navigateToTicket(ticket.ticket_id)}
                  className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-500">#{ticket.ticket_id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[(ticket.status as any)?.name] || 'bg-gray-100'}`}>
                        {(ticket.status as any)?.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[(ticket.priority as any)?.name] || 'bg-gray-100'}`}>
                        {(ticket.priority as any)?.name}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">{ticket.subject}</p>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Ticket</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of your issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Detailed description of the issue..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>Low</option>
                  <option value={2}>Medium</option>
                  <option value={3}>High</option>
                  <option value={4}>Critical</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewTicket(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
