'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useCallback } from 'react';
import { agentAPI } from '@/lib/api';
import { SupportTicket, SupportAgent } from '@/lib/supabase';
import { useAllTicketsRealtime } from '@/lib/useRealtime';
import {
  Ticket,
  AlertTriangle,
  Clock,
  User,
  LogOut,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  UserCircle,
  ChevronDown
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

type Tab = 'assigned' | 'escalated' | 'human-required';

export default function AgentDashboard() {
  const { user, logout, isLoading, switchAgent } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('assigned');
  const [stats, setStats] = useState<any>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [profile, setProfile] = useState<SupportAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [allAgents, setAllAgents] = useState<SupportAgent[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Memoized load functions
  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [statsData, profileData, agentsData] = await Promise.all([
        agentAPI.getDashboardStats(user.id),
        agentAPI.getMyProfile(user.id),
        agentAPI.getAllHumanAgents(),
      ]);
      setStats(statsData);
      setProfile(profileData);
      setAllAgents(agentsData);
      if (profileData) {
        setIsAvailable(profileData.is_available);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, [user?.id]);

  const loadTickets = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      let data: SupportTicket[] = [];

      if (activeTab === 'assigned') {
        data = await agentAPI.getAssignedTickets(user.id);
      } else if (activeTab === 'escalated') {
        data = await agentAPI.getEscalatedTickets();
      } else if (activeTab === 'human-required') {
        data = await agentAPI.getHumanRequiredTickets();
      }

      setTickets(data);
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeTab]);

  // Real-time WebSocket subscription
  useAllTicketsRealtime(() => {
    console.log('[Realtime] Ticket update received, refreshing...');
    loadTickets();
    loadDashboardData();
  });

  // Polling fallback every 10 seconds
  useEffect(() => {
    if (!user?.id) return;

    const pollInterval = setInterval(() => {
      console.log('[Polling] Refreshing tickets...');
      loadTickets();
      loadDashboardData();
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [user?.id, loadTickets, loadDashboardData]);

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = '/tms';
    } else if (!isLoading && user?.role !== 'agent') {
      window.location.href = `/tms/dashboard/${user?.role}`;
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [activeTab, user, loadTickets]);

  const handleAvailabilityToggle = async () => {
    try {
      const newStatus = !isAvailable;
      await agentAPI.updateAvailability(user!.id, newStatus);
      setIsAvailable(newStatus);
    } catch (err) {
      console.error('Error updating availability:', err);
    }
  };

  const handleClaimTicket = async (ticketId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await agentAPI.claimTicket(ticketId, user!.id);
      loadTickets();
      loadDashboardData();
    } catch (err) {
      console.error('Error claiming ticket:', err);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/tms';
  };

  const handleSwitchProfile = (agent: SupportAgent) => {
    if (switchAgent) {
      switchAgent(agent.support_agent_id, agent.full_name);
      setShowProfileMenu(false);
      // Reload page to refresh data for new agent
      window.location.reload();
    }
  };

  const navigateToTicket = (ticketId: number) => {
    window.location.href = `/tms/dashboard/agent/ticket/${ticketId}`;
  };

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const tabs = [
    { id: 'assigned' as Tab, label: 'My Tickets', icon: Ticket, count: stats?.assignedTickets },
    { id: 'escalated' as Tab, label: 'Escalated', icon: AlertTriangle, count: stats?.escalatedTickets },
    { id: 'human-required' as Tab, label: 'Needs Human', icon: User, count: stats?.humanRequiredTickets },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Support Agent Dashboard</h1>
            <p className="text-sm text-green-200">Welcome, {profile?.full_name || user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Profile Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-400 rounded-lg text-sm font-medium"
              >
                <UserCircle className="w-4 h-4" />
                <span>{profile?.full_name || 'Switch Profile'}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50">
                  <div className="px-3 py-2 text-xs text-gray-500 border-b">Switch Profile</div>
                  {allAgents.map((agent) => (
                    <button
                      key={agent.support_agent_id}
                      onClick={() => handleSwitchProfile(agent)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${agent.support_agent_id === user?.id ? 'bg-green-50 text-green-700' : 'text-gray-700'
                        }`}
                    >
                      <span>{agent.full_name}</span>
                      {agent.support_agent_id === user?.id && (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleAvailabilityToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isAvailable
                ? 'bg-green-500 hover:bg-green-400'
                : 'bg-red-500 hover:bg-red-400'
                }`}
            >
              {isAvailable ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Available
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  Offline
                </>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-green-200 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Ticket className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.assignedTickets}</p>
                  <p className="text-xs text-gray-500">Assigned to Me</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.escalatedTickets}</p>
                  <p className="text-xs text-gray-500">Escalated</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.humanRequiredTickets}</p>
                  <p className="text-xs text-gray-500">Needs Human</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.criticalTickets}</p>
                  <p className="text-xs text-gray-500">Critical</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              {activeTab === 'assigned' && 'My Assigned Tickets'}
              {activeTab === 'escalated' && 'Escalated Tickets'}
              {activeTab === 'human-required' && 'Tickets Requiring Human Agent'}
            </h2>
            <button
              onClick={loadTickets}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center">
              <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {activeTab === 'assigned' && 'No tickets assigned to you'}
                {activeTab === 'escalated' && 'No escalated tickets'}
                {activeTab === 'human-required' && 'No tickets requiring human agent'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {tickets.map((ticket) => {
                const statusName = (ticket.status as any)?.name || 'Unknown';
                const priorityName = (ticket.priority as any)?.name || 'Medium';
                const showClaim = activeTab !== 'assigned';

                return (
                  <div
                    key={ticket.ticket_id}
                    onClick={() => navigateToTicket(ticket.ticket_id)}
                    className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-500">#{ticket.ticket_id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[statusName]}`}>
                          {statusName}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[priorityName]}`}>
                          {priorityName}
                        </span>
                        {ticket.requires_human_agent && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Human Required
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900">{ticket.subject}</p>
                      <p className="text-sm text-gray-500">
                        {(ticket.contact as any)?.full_name} • {(ticket.organization as any)?.name} • {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {showClaim ? (
                      <button
                        onClick={(e) => handleClaimTicket(ticket.ticket_id, e)}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        Claim
                      </button>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
