import { SupportTicket, TicketMessage, Contact, SupportAgent, CurrentUser } from './supabase';

/**
 * Role-based database access layer via server-side API.
 */

async function dbCall(role: string, action: string, params?: any) {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, action, params: params || {} }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Database call failed: ${action}`);
  }
  return res.json();
}

// ============================================
// REQUESTER ACCESS (Limited to own data)
// ============================================

export const requesterAPI = {
  async getMyTickets(contactId: number): Promise<SupportTicket[]> {
    return dbCall('requester', 'getMyTickets', { contactId });
  },

  async getTicketDetails(ticketId: number, contactId: number): Promise<SupportTicket | null> {
    return dbCall('requester', 'getTicketDetails', { ticketId, contactId });
  },

  async getTicketMessages(ticketId: number, contactId: number): Promise<TicketMessage[]> {
    return dbCall('requester', 'getTicketMessages', { ticketId, contactId });
  },

  async createTicket(contactId: number, organizationId: number, subject: string, description: string, priorityId: number = 2): Promise<SupportTicket | null> {
    return dbCall('requester', 'createTicket', { contactId, organizationId, subject, description, priorityId });
  },

  async addMessage(ticketId: number, contactId: number, content: string): Promise<TicketMessage | null> {
    return dbCall('requester', 'addMessage', { ticketId, contactId, content });
  },

  async getMyProfile(contactId: number): Promise<Contact | null> {
    return dbCall('requester', 'getMyProfile', { contactId });
  },
};

// ============================================
// ADMIN ACCESS (Full access)
// ============================================

export const adminAPI = {
  async getAllTickets(filters?: {
    statusId?: number;
    priorityId?: number;
    organizationId?: number;
  }): Promise<SupportTicket[]> {
    return dbCall('admin', 'getAllTickets', { filters });
  },

  async getTicketDetails(ticketId: number): Promise<SupportTicket | null> {
    return dbCall('admin', 'getTicketDetails', { ticketId });
  },

  async getTicketMessages(ticketId: number): Promise<TicketMessage[]> {
    return dbCall('admin', 'getTicketMessages', { ticketId });
  },

  async getOrganizations() {
    return dbCall('admin', 'getOrganizations');
  },

  async getContacts(organizationId?: number): Promise<Contact[]> {
    return dbCall('admin', 'getContacts', { organizationId });
  },

  async getAgents(): Promise<SupportAgent[]> {
    return dbCall('admin', 'getAgents');
  },

  async createOrganization(name: string, uECode: number) {
    return dbCall('admin', 'createOrganization', { name, uECode });
  },

  async createContact(fullName: string, email: string, phone: string, organizationId: number) {
    return dbCall('admin', 'createContact', { fullName, email, phone, organizationId });
  },

  async createAgent(fullName: string, email: string, agentType: 'Bot' | 'Human', specialization?: string) {
    return dbCall('admin', 'createAgent', { fullName, email, agentType, specialization });
  },

  async updateTicketStatus(ticketId: number, statusId: number): Promise<boolean> {
    const result = await dbCall('admin', 'updateTicketStatus', { ticketId, statusId });
    return result?.success ?? false;
  },

  async assignTicket(ticketId: number, agentId: number, isPrimary: boolean = true): Promise<boolean> {
    const result = await dbCall('admin', 'assignTicket', { ticketId, agentId, isPrimary });
    return result?.success ?? false;
  },

  async assignAIBot(ticketId: number): Promise<{ success: boolean; category?: string; error?: string }> {
    try {
      const response = await fetch('/api/ai-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', ticketId }),
      });
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Failed to assign AI bot' };
      }
      const result = await response.json();
      return { success: true, category: result.category };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },

  async getAIBotStatus(ticketId: number): Promise<{ hasAIBot: boolean; botDetails?: any }> {
    try {
      const response = await fetch(`/api/ai-resolve?ticketId=${ticketId}`);
      if (!response.ok) return { hasAIBot: false };
      return await response.json();
    } catch {
      return { hasAIBot: false };
    }
  },

  async getDashboardStats() {
    const data = await dbCall('admin', 'getDashboardStats');
    return {
      totalTickets: Number(data.total_tickets),
      openTickets: Number(data.open_tickets),
      inProgressTickets: Number(data.in_progress_tickets),
      escalatedTickets: Number(data.escalated_tickets),
      criticalTickets: Number(data.critical_tickets),
      totalOrganizations: Number(data.total_organizations),
      totalContacts: Number(data.total_contacts),
      totalAgents: Number(data.total_agents),
      availableAgents: Number(data.available_agents),
    };
  },
};

// ============================================
// AGENT ACCESS (Assigned and escalated tickets)
// ============================================

export const agentAPI = {
  async getAssignedTickets(agentId: number): Promise<SupportTicket[]> {
    const data = await dbCall('agent', 'getAssignedTickets', { agentId });
    if (!data || data.length === 0) {
      return this.getEscalatedTickets();
    }
    return data;
  },

  async getEscalatedTickets(): Promise<SupportTicket[]> {
    return dbCall('agent', 'getEscalatedTickets');
  },

  async getHumanRequiredTickets(): Promise<SupportTicket[]> {
    return dbCall('agent', 'getHumanRequiredTickets');
  },

  async getTicketDetails(ticketId: number, agentId: number): Promise<SupportTicket | null> {
    return dbCall('agent', 'getTicketDetails', { ticketId, agentId });
  },

  async getTicketMessages(ticketId: number, agentId: number): Promise<TicketMessage[]> {
    return dbCall('agent', 'getTicketMessages', { ticketId, agentId });
  },

  async addMessage(ticketId: number, agentId: number, content: string): Promise<TicketMessage | null> {
    return dbCall('agent', 'addMessage', { ticketId, agentId, content });
  },

  async updateTicketStatus(ticketId: number, agentId: number, statusId: number): Promise<boolean> {
    const result = await dbCall('agent', 'updateTicketStatus', { ticketId, agentId, statusId });
    return result?.success ?? false;
  },

  async claimTicket(ticketId: number, agentId: number): Promise<boolean> {
    const result = await dbCall('agent', 'claimTicket', { ticketId, agentId });
    return result?.success ?? false;
  },

  async getMyProfile(agentId: number): Promise<SupportAgent | null> {
    return dbCall('agent', 'getMyProfile', { agentId });
  },

  async updateAvailability(agentId: number, isAvailable: boolean): Promise<boolean> {
    const result = await dbCall('agent', 'updateAvailability', { agentId, isAvailable });
    return result?.success ?? false;
  },

  async getDashboardStats(agentId: number) {
    const data = await dbCall('agent', 'getDashboardStats', { agentId });
    return {
      assignedTickets: Number(data.assigned_tickets),
      escalatedTickets: Number(data.escalated_tickets),
      humanRequiredTickets: Number(data.human_required_tickets),
      criticalTickets: Number(data.critical_tickets),
    };
  },

  async getAllHumanAgents(): Promise<SupportAgent[]> {
    return dbCall('agent', 'getAllHumanAgents');
  },
};

// ============================================
// Utility functions
// ============================================

export async function getTicketStatuses() {
  return dbCall('util', 'getTicketStatuses');
}

export async function getTicketPriorities() {
  return dbCall('util', 'getTicketPriorities');
}

// ============================================
// Location Management (Admin)
// ============================================

export async function getLocations(organizationId?: number) {
  return dbCall('util', 'getLocations', { organizationId });
}

export async function createLocation(
  organizationId: number,
  name: string,
  locationType: string = 'Other',
  requiresHumanAgent: boolean = false
) {
  return dbCall('util', 'createLocation', { organizationId, name, locationType, requiresHumanAgent });
}

// ============================================
// Device Management (Admin)
// ============================================

export async function getDevices(organizationId?: number, locationId?: number) {
  return dbCall('util', 'getDevices', { organizationId, locationId });
}

export async function getDeviceById(deviceId: number) {
  return dbCall('util', 'getDeviceById', { deviceId });
}

// ============================================
// Device Lookup Tables (Admin)
// ============================================

export async function getDeviceManufacturers() {
  return dbCall('util', 'getDeviceManufacturers');
}

export async function getDeviceModels(manufacturerId?: number) {
  return dbCall('util', 'getDeviceModels', { manufacturerId });
}

export async function getOperatingSystems() {
  return dbCall('util', 'getOperatingSystems');
}

export async function getDeviceTypes() {
  return dbCall('util', 'getDeviceTypes');
}

export async function getDomains() {
  return dbCall('util', 'getDomains');
}

// ============================================
// Account Manager (Admin)
// ============================================

export async function getAccountManagers() {
  return dbCall('util', 'getAccountManagers');
}

export async function createAccountManager(fullName: string, email: string, phone?: string) {
  return dbCall('util', 'createAccountManager', { fullName, email, phone });
}

// ============================================
// Contact Devices (Admin)
// ============================================

export async function getContactDevices(contactId: number) {
  return dbCall('util', 'getContactDevices', { contactId });
}

export async function assignDeviceToContact(contactId: number, deviceId: number) {
  return dbCall('util', 'assignDeviceToContact', { contactId, deviceId });
}

export async function unassignDeviceFromContact(contactId: number, deviceId: number) {
  return dbCall('util', 'unassignDeviceFromContact', { contactId, deviceId });
}

// ============================================
// Ticket Escalations (Agent/Admin)
// ============================================

export async function getTicketEscalations(ticketId: number) {
  return dbCall('util', 'getTicketEscalations', { ticketId });
}

export async function createEscalation(
  ticketId: number,
  fromAgentId: number,
  toAgentId: number | null,
  reason: string
) {
  return dbCall('util', 'createEscalation', { ticketId, fromAgentId, toAgentId, reason });
}

// ============================================
// Processor Info (Admin - for device details)
// ============================================

export async function getProcessorModels() {
  return dbCall('util', 'getProcessorModels');
}

export async function getProcessorArchitectures() {
  return dbCall('util', 'getProcessorArchitectures');
}

export async function getUpdateStatuses() {
  return dbCall('util', 'getUpdateStatuses');
}
