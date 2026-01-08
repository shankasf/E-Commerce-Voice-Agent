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
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ChatWidget } from '@/components/ChatWidget';

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

  // Polling fallback every 10 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      console.log('[Polling] Refreshing data...');
      loadDashboardData();
      if (activeTab === 'tickets') loadTickets();
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [activeTab, loadDashboardData, loadTickets]);

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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const tabs = [
    { id: 'tickets' as Tab, label: 'All Tickets', icon: Ticket, count: stats?.totalTickets },
    { id: 'organizations' as Tab, label: 'Organizations', icon: Building2, count: stats?.totalOrganizations },
    { id: 'contacts' as Tab, label: 'Contacts', icon: Users, count: stats?.totalContacts },
    { id: 'agents' as Tab, label: 'Agents', icon: Headphones, count: stats?.totalAgents },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-purple-200">U Rack IT Management Console</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/dashboard/admin/chat'}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              AI Chat
            </button>
            <button
              onClick={() => setShowMetrics(true)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              AI Metrics
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-purple-200 hover:text-white"
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
            <div className="grid grid-cols-5 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.openTickets}</p>
                  <p className="text-xs text-gray-500">Open</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.inProgressTickets}</p>
                  <p className="text-xs text-gray-500">In Progress</p>
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
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.criticalTickets}</p>
                  <p className="text-xs text-gray-500">Critical</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stats.availableAgents}/{stats.totalAgents}</p>
                  <p className="text-xs text-gray-500">Agents Available</p>
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
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">All Tickets</h2>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter || ''}
                  onChange={(e) => setStatusFilter(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1"
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
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No tickets found</div>
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
                        {ticket.requires_human_agent && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Needs Human
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900">{ticket.subject}</p>
                      <p className="text-sm text-gray-500">
                        {(ticket.contact as any)?.full_name} • {(ticket.organization as any)?.name} • {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Organizations</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : organizations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No organizations found</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {organizations.map((org) => (
                  <div key={org.organization_id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{org.name}</p>
                        <p className="text-sm text-gray-500">U&E Code: {org.u_e_code}</p>
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
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Contacts</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No contacts found</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <div key={contact.contact_id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{contact.full_name}</p>
                        <p className="text-sm text-gray-500">{contact.email} • {contact.phone}</p>
                        <p className="text-xs text-gray-400">{(contact.organization as any)?.name}</p>
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
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Support Agents</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : agents.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No agents found</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {agents.map((agent) => (
                  <div key={agent.support_agent_id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${agent.agent_type === 'Bot' ? 'bg-purple-100' : 'bg-green-100'
                        }`}>
                        <Headphones className={`w-5 h-5 ${agent.agent_type === 'Bot' ? 'text-purple-600' : 'text-green-600'
                          }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{agent.full_name}</p>
                        <p className="text-sm text-gray-500">
                          {agent.agent_type} • {agent.specialization || 'General'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${agent.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
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

      {/* Chat Widget - Bottom Right */}
      <ChatWidget />
    </div>
  );
}
