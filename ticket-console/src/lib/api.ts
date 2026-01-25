/**
 * Client-side API layer
 * All data operations go through the /api/data route
 * This ensures the Supabase service role key is never exposed to the client
 */

import { SupportTicket, TicketMessage, Contact, Organization, SupportAgent } from './supabase';

// Helper function to call the data API
async function callDataAPI<T>(action: string, params: Record<string, any> = {}): Promise<T> {
  const response = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || 'API request failed');
  }

  return result.data;
}

// ============================================
// REQUESTER ACCESS (Limited to own data)
// ============================================

export const requesterAPI = {
  async getMyTickets(contactId: number): Promise<SupportTicket[]> {
    return callDataAPI<SupportTicket[]>('requester.getMyTickets', { contactId });
  },

  async getTicketDetails(ticketId: number, contactId: number): Promise<SupportTicket | null> {
    return callDataAPI<SupportTicket | null>('requester.getTicketDetails', { ticketId, contactId });
  },

  async getTicketMessages(ticketId: number, contactId: number): Promise<TicketMessage[]> {
    return callDataAPI<TicketMessage[]>('requester.getTicketMessages', { ticketId, contactId });
  },

  async createTicket(contactId: number, organizationId: number, subject: string, description: string, priorityId: number = 2): Promise<SupportTicket | null> {
    const ticket = await callDataAPI<SupportTicket | null>('requester.createTicket', {
      contactId,
      organizationId,
      subject,
      description,
      priorityId,
    });

    // Automatically assign AI bot to the new ticket (fire and forget)
    if (ticket) {
      fetch('/api/ai-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          ticketId: ticket.ticket_id,
        }),
      }).catch(e => console.log('AI bot auto-assignment failed:', e));
    }

    return ticket;
  },

  async addMessage(ticketId: number, contactId: number, content: string): Promise<TicketMessage | null> {
    const message = await callDataAPI<TicketMessage | null>('requester.addMessage', {
      ticketId,
      contactId,
      content,
    });

    // Trigger AI bot response (fire and forget)
    fetch('/api/ai-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'respond',
        ticketId,
        userMessage: content,
      }),
    }).catch(e => console.log('AI bot response not triggered:', e));

    return message;
  },

  async getMyProfile(contactId: number): Promise<Contact | null> {
    return callDataAPI<Contact | null>('requester.getMyProfile', { contactId });
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
    return callDataAPI<SupportTicket[]>('admin.getAllTickets', filters || {});
  },

  async getTicketDetails(ticketId: number): Promise<SupportTicket | null> {
    return callDataAPI<SupportTicket | null>('admin.getTicketDetails', { ticketId });
  },

  async getTicketMessages(ticketId: number): Promise<TicketMessage[]> {
    return callDataAPI<TicketMessage[]>('admin.getTicketMessages', { ticketId });
  },

  async getOrganizations(): Promise<Organization[]> {
    return callDataAPI<Organization[]>('admin.getOrganizations');
  },

  async getContacts(organizationId?: number): Promise<Contact[]> {
    return callDataAPI<Contact[]>('admin.getContacts', { organizationId });
  },

  async getAgents(): Promise<SupportAgent[]> {
    return callDataAPI<SupportAgent[]>('admin.getAgents');
  },

  async createOrganization(name: string, uECode: number): Promise<Organization | null> {
    return callDataAPI<Organization | null>('admin.createOrganization', { name, uECode });
  },

  async createContact(fullName: string, email: string, phone: string, organizationId: number): Promise<Contact | null> {
    return callDataAPI<Contact | null>('admin.createContact', { fullName, email, phone, organizationId });
  },

  async createAgent(fullName: string, email: string, agentType: 'Bot' | 'Human', specialization?: string): Promise<SupportAgent | null> {
    return callDataAPI<SupportAgent | null>('admin.createAgent', { fullName, email, agentType, specialization });
  },

  async updateTicketStatus(ticketId: number, statusId: number): Promise<boolean> {
    const result = await callDataAPI<{ success: boolean }>('admin.updateTicketStatus', { ticketId, statusId });
    return result?.success ?? false;
  },

  async assignTicket(ticketId: number, agentId: number, isPrimary: boolean = true): Promise<boolean> {
    const result = await callDataAPI<{ success: boolean }>('admin.assignTicket', { ticketId, agentId, isPrimary });
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
    return callDataAPI<{
      totalTickets: number;
      openTickets: number;
      inProgressTickets: number;
      escalatedTickets: number;
      criticalTickets: number;
      totalOrganizations: number;
      totalContacts: number;
      totalAgents: number;
      availableAgents: number;
    }>('admin.getDashboardStats');
  },
};

// ============================================
// AGENT ACCESS (Assigned and escalated tickets)
// ============================================

export const agentAPI = {
  async getAssignedTickets(agentId: number): Promise<SupportTicket[]> {
    return callDataAPI<SupportTicket[]>('agent.getAssignedTickets', { agentId });
  },

  async getEscalatedTickets(): Promise<SupportTicket[]> {
    return callDataAPI<SupportTicket[]>('agent.getEscalatedTickets');
  },

  async getHumanRequiredTickets(): Promise<SupportTicket[]> {
    return callDataAPI<SupportTicket[]>('agent.getHumanRequiredTickets');
  },

  async getTicketDetails(ticketId: number, agentId: number): Promise<SupportTicket | null> {
    return callDataAPI<SupportTicket | null>('agent.getTicketDetails', { ticketId, agentId });
  },

  async getTicketMessages(ticketId: number, agentId: number): Promise<TicketMessage[]> {
    return callDataAPI<TicketMessage[]>('agent.getTicketMessages', { ticketId, agentId });
  },

  async addMessage(ticketId: number, agentId: number, content: string): Promise<TicketMessage | null> {
    return callDataAPI<TicketMessage | null>('agent.addMessage', { ticketId, agentId, content });
  },

  async updateTicketStatus(ticketId: number, agentId: number, statusId: number): Promise<boolean> {
    const result = await callDataAPI<{ success: boolean }>('agent.updateTicketStatus', { ticketId, agentId, statusId });
    return result?.success ?? false;
  },

  async claimTicket(ticketId: number, agentId: number): Promise<boolean> {
    const result = await callDataAPI<{ success: boolean }>('agent.claimTicket', { ticketId, agentId });
    return result?.success ?? false;
  },

  async getMyProfile(agentId: number): Promise<SupportAgent | null> {
    return callDataAPI<SupportAgent | null>('agent.getMyProfile', { agentId });
  },

  async updateAvailability(agentId: number, isAvailable: boolean): Promise<boolean> {
    const result = await callDataAPI<{ success: boolean }>('agent.updateAvailability', { agentId, isAvailable });
    return result?.success ?? false;
  },

  async getDashboardStats(agentId: number) {
    return callDataAPI<{
      assignedTickets: number;
      escalatedTickets: number;
      humanRequiredTickets: number;
      criticalTickets: number;
    }>('agent.getDashboardStats', { agentId });
  },

  async getAllHumanAgents(): Promise<SupportAgent[]> {
    return callDataAPI<SupportAgent[]>('agent.getAllHumanAgents');
  },
};

// ============================================
// Utility functions
// ============================================

export async function getTicketStatuses() {
  return callDataAPI<any[]>('getTicketStatuses');
}

export async function getTicketPriorities() {
  return callDataAPI<any[]>('getTicketPriorities');
}

// ============================================
// Location Management (Admin)
// ============================================

export async function getLocations(organizationId?: number) {
  return callDataAPI<any[]>('getLocations', { organizationId });
}

export async function createLocation(
  organizationId: number,
  name: string,
  locationType: string = 'Other',
  requiresHumanAgent: boolean = false
) {
  return callDataAPI<any>('createLocation', { organizationId, name, locationType, requiresHumanAgent });
}

// ============================================
// Device Management (Admin)
// ============================================

export async function getDevices(organizationId?: number, locationId?: number) {
  return callDataAPI<any[]>('getDevices', { organizationId, locationId });
}

export async function getDeviceById(deviceId: number) {
  return callDataAPI<any>('getDeviceById', { deviceId });
}

// ============================================
// Device Lookup Tables (Admin)
// ============================================

export async function getDeviceManufacturers() {
  return callDataAPI<any[]>('getDeviceManufacturers');
}

export async function getDeviceModels(manufacturerId?: number) {
  return callDataAPI<any[]>('getDeviceModels', { manufacturerId });
}

export async function getOperatingSystems() {
  return callDataAPI<any[]>('getOperatingSystems');
}

export async function getDeviceTypes() {
  return callDataAPI<any[]>('getDeviceTypes');
}

export async function getDomains() {
  return callDataAPI<any[]>('getDomains');
}

// ============================================
// Account Manager (Admin)
// ============================================

export async function getAccountManagers() {
  return callDataAPI<any[]>('getAccountManagers');
}

export async function createAccountManager(fullName: string, email: string, phone?: string) {
  return callDataAPI<any>('createAccountManager', { fullName, email, phone });
}

// ============================================
// Contact Devices (Admin)
// ============================================

export async function getContactDevices(contactId: number) {
  return callDataAPI<any[]>('getContactDevices', { contactId });
}

export async function assignDeviceToContact(contactId: number, deviceId: number) {
  return callDataAPI<any>('assignDeviceToContact', { contactId, deviceId });
}

export async function unassignDeviceFromContact(contactId: number, deviceId: number) {
  return callDataAPI<{ success: boolean }>('unassignDeviceFromContact', { contactId, deviceId });
}

// ============================================
// Ticket Escalations (Agent/Admin)
// ============================================

export async function getTicketEscalations(ticketId: number) {
  return callDataAPI<any[]>('getTicketEscalations', { ticketId });
}

export async function createEscalation(
  ticketId: number,
  fromAgentId: number,
  toAgentId: number | null,
  reason: string
) {
  return callDataAPI<any>('createEscalation', { ticketId, fromAgentId, toAgentId, reason });
}

// ============================================
// Processor Info (Admin - for device details)
// ============================================

export async function getProcessorModels() {
  return callDataAPI<any[]>('getProcessorModels');
}

export async function getProcessorArchitectures() {
  return callDataAPI<any[]>('getProcessorArchitectures');
}

export async function getUpdateStatuses() {
  return callDataAPI<any[]>('getUpdateStatuses');
}
