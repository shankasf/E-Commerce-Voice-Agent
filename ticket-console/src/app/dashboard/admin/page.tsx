'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useCallback } from 'react';
import { adminAPI } from '@/lib/api';
import { SupportTicket, Organization, Contact, SupportAgent } from '@/lib/supabase';
import { useAllTicketsRealtime } from '@/lib/useRealtime';
import { AIMetricsModal } from '@/components/AIMetricsModal';
import {
  Ticket,
  Building2,
  Users,
  Headphones,
  AlertTriangle,
  Clock,
  CheckCircle,
  LogOut,
  ChevronRight,
  Plus,
  Filter,
  RefreshCw,
  BarChart3,
  Shield
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

type Tab = 'tickets' | 'organizations' | 'contacts' | 'agents';

export default function AdminDashboard() {
  const { user, logout, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('tickets');
  const [stats, setStats] = useState<any>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<number | undefined>();
  const [showMetrics, setShowMetrics] = useState(false);

  // Memoized load functions
  const loadDashboardData = useCallback(async () => {
    try {
      const statsData = await adminAPI.getDashboardStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getAllTickets({ statusId: statusFilter });
      setTickets(data);
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getOrganizations();
      setOrganizations(data);
    } catch (err) {
      console.error('Error loading organizations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getContacts();
      setContacts(data);
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Error loading agents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time WebSocket subscription
  useAllTicketsRealtime(() => {
    console.log('[Realtime] Update received, refreshing...');
    loadDashboardData();
    if (activeTab === 'tickets') loadTickets();
  });

  // Polling fallback every 15 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      console.log('[Polling] Refreshing data...');
      loadDashboardData();
      if (activeTab === 'tickets') loadTickets();
    }, 15000); // Increased to 15s to reduce flickering

    return () => clearInterval(pollInterval);
  }, [activeTab]); // Removed callbacks from dependencies to prevent constant re-creation

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      window.location.href = '/';
    } else if (mounted && !isLoading && user?.role !== 'admin') {
      window.location.href = `/dashboard/${user?.role}`;
    }
  }, [user, isLoading, mounted]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  useEffect(() => {
    if (activeTab === 'tickets') loadTickets();
    else if (activeTab === 'organizations') loadOrganizations();
    else if (activeTab === 'contacts') loadContacts();
    else if (activeTab === 'agents') loadAgents();
  }, [activeTab, statusFilter, loadTickets, loadOrganizations, loadContacts, loadAgents]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const navigateToTicket = (ticketId: number) => {
    window.location.href = `/dashboard/admin/ticket/${ticketId}`;
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-layered flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl animate-pulse shadow-2xl glow-purple"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-slate-700 font-semibold text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'tickets' as Tab, label: 'All Tickets', icon: Ticket, count: stats?.totalTickets, color: 'blue' },
    { id: 'organizations' as Tab, label: 'Organizations', icon: Building2, count: stats?.totalOrganizations, color: 'purple' },
    { id: 'contacts' as Tab, label: 'Contacts', icon: Users, count: stats?.totalContacts, color: 'green' },
    { id: 'agents' as Tab, label: 'Agents', icon: Headphones, count: stats?.totalAgents, color: 'orange' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-layered">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-blue-400/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '3s' }}></div>
          </div>

      {/* Header - Enhanced */}
      <header className="relative bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white shadow-2xl sticky top-0 z-50 border-b border-purple-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-sm text-purple-100 mt-0.5 font-medium">U Rack IT Management Console</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMetrics(true)}
              className="btn bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm shadow-lg hover:shadow-xl"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="hidden sm:inline">AI Metrics</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-ghost text-purple-100 hover:text-white hover:bg-white/10 p-3"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="bg-slate-800/50 border-b border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="grid grid-cols-5 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-100">{stats.openTickets}</p>
                  <p className="text-xs text-slate-400">Open</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-100">{stats.inProgressTickets}</p>
                  <p className="text-xs text-slate-400">In Progress</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-100">{stats.escalatedTickets}</p>
                  <p className="text-xs text-slate-400">Escalated</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-100">{stats.criticalTickets}</p>
                  <p className="text-xs text-slate-400">Critical</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-100">{stats.availableAgents}/{stats.totalAgents}</p>
                  <p className="text-xs text-slate-400">Agents Available</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-xs bg-slate-800/50 border border-slate-700/50 px-2 py-0.5 rounded-full">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">All Tickets</h2>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter || ''}
                  onChange={(e) => setStatusFilter(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="text-sm border border-slate-700/50 rounded-lg px-3 py-1"
                >
                  <option value="">All Statuses</option>
                  <option value="1">Open</option>
                  <option value="2">In Progress</option>
                  <option value="3">Awaiting Customer</option>
                  <option value="4">Escalated</option>
                  <option value="5">Resolved</option>
                  <option value="6">Closed</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No tickets found</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.ticket_id}
                    onClick={() => navigateToTicket(ticket.ticket_id)}
                    className="p-4 hover:bg-slate-800/70 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-slate-400">#{ticket.ticket_id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[(ticket.status as any)?.name] || 'bg-slate-800/50 border border-slate-700/50'}`}>
                          {(ticket.status as any)?.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[(ticket.priority as any)?.name] || 'bg-slate-800/50 border border-slate-700/50'}`}>
                          {(ticket.priority as any)?.name}
                        </span>
                        {ticket.requires_human_agent && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Needs Human
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-slate-100">{ticket.subject}</p>
                      <p className="text-sm text-slate-400">
                        {(ticket.contact as any)?.full_name} • {(ticket.organization as any)?.name} • {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-100">Organizations</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading...</div>
            ) : organizations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No organizations found</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {organizations.map((org) => (
                  <div key={org.organization_id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-100">{org.name}</p>
                        <p className="text-sm text-slate-400">U&E Code: {org.u_e_code}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="font-semibold text-slate-100">Contacts</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading...</div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No contacts found</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {contacts.map((contact) => (
                  <div key={contact.contact_id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-100">{contact.full_name}</p>
                        <p className="text-sm text-slate-400">{contact.email} • {contact.phone}</p>
                        <p className="text-xs text-slate-400">{(contact.organization as any)?.name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="font-semibold text-slate-100">Support Agents</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading...</div>
            ) : agents.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No agents found</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {agents.map((agent) => (
                  <div key={agent.support_agent_id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${agent.agent_type === 'Bot' ? 'bg-purple-100' : 'bg-green-100'
                        }`}>
                        <Headphones className={`w-5 h-5 ${agent.agent_type === 'Bot' ? 'text-purple-600' : 'text-green-600'
                          }`} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-100">{agent.full_name}</p>
                        <p className="text-sm text-slate-400">
                          {agent.agent_type} • {agent.specialization || 'General'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${agent.is_available ? 'bg-green-600/20 border border-green-500/50 text-green-300' : 'bg-slate-800/50 border border-slate-700/50 text-slate-300'
                      }`}>
                      {agent.is_available ? 'Available' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* AI Metrics Modal */}
      <AIMetricsModal isOpen={showMetrics} onClose={() => setShowMetrics(false)} />
    </div>
  );
}
