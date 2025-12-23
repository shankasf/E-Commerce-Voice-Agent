import axios from 'axios';
import type {
  OverviewMetrics,
  CallLog,
  CallMetrics,
  TicketMetrics,
  Ticket,
  DeviceMetrics,
  Device,
  Organization,
  OrganizationMetrics,
  Contact,
  ContactMetrics,
  SystemHealth,
  SystemMetrics,
  CostMetrics,
  AgentStats,
  AuthResponse,
  LoginRequest,
  PaginatedResponse,
} from '../types';

const API_BASE = '/v2/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/v2/dashboard/login';
    }
    return Promise.reject(error);
  }
);

// =====================================================
// AUTH
// =====================================================

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await api.post('/auth/login', data);
    return res.data;
  },
  
  getProfile: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

// =====================================================
// DASHBOARD
// =====================================================

export const dashboardApi = {
  getOverview: async (range = '7d'): Promise<{ metrics: OverviewMetrics }> => {
    const res = await api.get(`/dashboard/overview?range=${range}`);
    return res.data;
  },

  getDevices: async (range = '7d'): Promise<{ metrics: DeviceMetrics; devices: Device[] }> => {
    const res = await api.get(`/dashboard/devices?range=${range}`);
    return res.data;
  },

  getCalls: async (range = '7d'): Promise<{ metrics: CallMetrics; calls: CallLog[] }> => {
    const res = await api.get(`/dashboard/calls?range=${range}`);
    return res.data;
  },

  getTickets: async (range = '7d'): Promise<{ metrics: TicketMetrics; tickets: Ticket[] }> => {
    const res = await api.get(`/dashboard/tickets?range=${range}`);
    return res.data;
  },

  getSystem: async (): Promise<{ metrics: SystemHealth }> => {
    const res = await api.get('/dashboard/system');
    return res.data;
  },

  getSystemHealth: async (): Promise<{ metrics: SystemMetrics }> => {
    const res = await api.get('/dashboard/system');
    return res.data;
  },

  getCosts: async (range = '7d'): Promise<{ metrics: CostMetrics }> => {
    const res = await api.get(`/dashboard/costs?range=${range}`);
    return res.data;
  },

  getAgentStats: async (range = '7d'): Promise<{ distribution: AgentStats[] }> => {
    const res = await api.get(`/dashboard/ai?range=${range}`);
    return res.data;
  },

  getOrganizations: async (): Promise<{ organizations: Organization[]; metrics: OrganizationMetrics }> => {
    const res = await api.get('/dashboard/organizations');
    return res.data;
  },

  getContacts: async (): Promise<{ contacts: Contact[]; metrics: ContactMetrics }> => {
    const res = await api.get('/dashboard/contacts');
    return res.data;
  },
};

// =====================================================
// CALLS
// =====================================================

export const callsApi = {
  getAll: async (params?: {
    skip?: number;
    take?: number;
    status?: string;
  }): Promise<PaginatedResponse<CallLog>> => {
    const res = await api.get('/calls', { params });
    return res.data;
  },

  getById: async (callId: string): Promise<CallLog> => {
    const res = await api.get(`/calls/${callId}`);
    return res.data;
  },
};

// =====================================================
// TICKETS
// =====================================================

export const ticketsApi = {
  getAll: async (params?: {
    skip?: number;
    take?: number;
    status?: string;
    priority?: string;
  }): Promise<PaginatedResponse<Ticket>> => {
    const res = await api.get('/tickets', { params });
    return res.data;
  },

  getById: async (ticketId: number): Promise<Ticket> => {
    const res = await api.get(`/tickets/${ticketId}`);
    return res.data;
  },

  getStats: async (): Promise<TicketMetrics> => {
    const res = await api.get('/tickets/stats');
    return res.data;
  },
};

// =====================================================
// DEVICES
// =====================================================

export const devicesApi = {
  getAll: async (params?: {
    skip?: number;
    take?: number;
    status?: string;
    organizationId?: number;
  }): Promise<PaginatedResponse<Device>> => {
    const res = await api.get('/devices', { params });
    return res.data;
  },

  getById: async (deviceId: number): Promise<Device> => {
    const res = await api.get(`/devices/${deviceId}`);
    return res.data;
  },
};

// =====================================================
// ORGANIZATIONS
// =====================================================

export const organizationsApi = {
  getAll: async (params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedResponse<Organization>> => {
    const res = await api.get('/organizations', { params });
    return res.data;
  },

  getById: async (orgId: number): Promise<Organization> => {
    const res = await api.get(`/organizations/${orgId}`);
    return res.data;
  },
};

// =====================================================
// CONTACTS
// =====================================================

export const contactsApi = {
  getAll: async (params?: {
    skip?: number;
    take?: number;
    organizationId?: number;
  }): Promise<PaginatedResponse<Contact>> => {
    const res = await api.get('/contacts', { params });
    return res.data;
  },

  getByPhone: async (phone: string): Promise<Contact> => {
    const res = await api.get(`/contacts/phone/${phone}`);
    return res.data;
  },
};

export default api;
