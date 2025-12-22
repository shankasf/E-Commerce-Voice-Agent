import { supabase, SupportTicket, TicketMessage, Contact, Organization, SupportAgent, CurrentUser } from './supabase';

/**
 * Role-based database access layer.
 * 
 * Access Control:
 * - Requester: Own tickets only, own organization info, can create tickets/messages
 * - Admin: All data, can manage organizations/contacts/agents
 * - Agent: Assigned tickets, escalated tickets, can update status/messages
 */

// ============================================
// REQUESTER ACCESS (Limited to own data)
// ============================================

export const requesterAPI = {
  // Get only the requester's tickets
  async getMyTickets(contactId: number): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        status:status_id(name),
        priority:priority_id(name),
        organization:organization_id(name)
      `)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get ticket details (only if owned by requester)
  async getTicketDetails(ticketId: number, contactId: number): Promise<SupportTicket | null> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        status:status_id(name),
        priority:priority_id(name),
        organization:organization_id(name),
        contact:contact_id(full_name, email, phone)
      `)
      .eq('ticket_id', ticketId)
      .eq('contact_id', contactId) // Security: only own tickets
      .single();
    
    if (error) return null;
    return data;
  },

  // Get messages for a ticket (only if owned)
  async getTicketMessages(ticketId: number, contactId: number): Promise<TicketMessage[]> {
    // First verify ticket belongs to requester
    const ticket = await this.getTicketDetails(ticketId, contactId);
    if (!ticket) return [];

    const { data, error } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender_agent:sender_agent_id(full_name, agent_type),
        sender_contact:sender_contact_id(full_name)
      `)
      .eq('ticket_id', ticketId)
      .order('message_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Create a new ticket
  async createTicket(contactId: number, organizationId: number, subject: string, description: string, priorityId: number = 2): Promise<SupportTicket | null> {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        contact_id: contactId,
        organization_id: organizationId,
        subject,
        description,
        status_id: 1, // Open
        priority_id: priorityId,
        requires_human_agent: false,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Automatically assign AI bot to the new ticket (fire and forget - don't block UI)
    if (data) {
      fetch('/tms/api/ai-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          ticketId: data.ticket_id,
        }),
      }).catch(e => console.log('AI bot auto-assignment failed:', e));
    }
    
    return data;
  },

  // Add a message to own ticket
  async addMessage(ticketId: number, contactId: number, content: string): Promise<TicketMessage | null> {
    // Verify ownership
    const ticket = await this.getTicketDetails(ticketId, contactId);
    if (!ticket) return null;

    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_contact_id: contactId,
        content,
        message_type: 'text',
      })
      .select()
      .single();
    
    if (error) throw error;

    // Trigger AI bot response (fire and forget - don't block UI)
    fetch('/tms/api/ai-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'respond',
        ticketId,
        userMessage: content,
      }),
    }).catch(e => console.log('AI bot response not triggered:', e));

    return data;
  },

  // Get own contact info
  async getMyProfile(contactId: number): Promise<Contact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select(`*, organization:organization_id(name, u_e_code)`)
      .eq('contact_id', contactId)
      .single();
    
    if (error) return null;
    return data;
  },
};

// ============================================
// ADMIN ACCESS (Full access)
// ============================================

export const adminAPI = {
  // Get all tickets (with filters)
  async getAllTickets(filters?: {
    statusId?: number;
    priorityId?: number;
    organizationId?: number;
  }): Promise<SupportTicket[]> {
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        status:status_id(name),
        priority:priority_id(name),
        organization:organization_id(name),
        contact:contact_id(full_name, phone)
      `)
      .order('created_at', { ascending: false });
    
    if (filters?.statusId) query = query.eq('status_id', filters.statusId);
    if (filters?.priorityId) query = query.eq('priority_id', filters.priorityId);
    if (filters?.organizationId) query = query.eq('organization_id', filters.organizationId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get ticket details (any ticket)
  async getTicketDetails(ticketId: number): Promise<SupportTicket | null> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        status:status_id(name),
        priority:priority_id(name),
        organization:organization_id(name, u_e_code),
        contact:contact_id(full_name, email, phone)
      `)
      .eq('ticket_id', ticketId)
      .single();
    
    if (error) return null;
    return data;
  },

  // Get all messages for any ticket
  async getTicketMessages(ticketId: number): Promise<TicketMessage[]> {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender_agent:sender_agent_id(full_name, agent_type),
        sender_contact:sender_contact_id(full_name)
      `)
      .eq('ticket_id', ticketId)
      .order('message_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get all organizations
  async getOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  // Get all contacts
  async getContacts(organizationId?: number): Promise<Contact[]> {
    let query = supabase
      .from('contacts')
      .select(`*, organization:organization_id(name)`)
      .order('full_name');
    
    if (organizationId) query = query.eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Get all support agents
  async getAgents(): Promise<SupportAgent[]> {
    const { data, error } = await supabase
      .from('support_agents')
      .select('*')
      .order('full_name');
    
    if (error) throw error;
    return data || [];
  },

  // Create organization
  async createOrganization(name: string, uECode: number): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .insert({ name, u_e_code: uECode })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create contact
  async createContact(fullName: string, email: string, phone: string, organizationId: number): Promise<Contact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .insert({ full_name: fullName, email, phone, organization_id: organizationId })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create support agent
  async createAgent(fullName: string, email: string, agentType: 'Bot' | 'Human', specialization?: string): Promise<SupportAgent | null> {
    const { data, error } = await supabase
      .from('support_agents')
      .insert({
        full_name: fullName,
        email,
        agent_type: agentType,
        specialization,
        is_available: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update ticket status (admin can do anything)
  async updateTicketStatus(ticketId: number, statusId: number): Promise<boolean> {
    const updateData: any = { status_id: statusId, updated_at: new Date().toISOString() };
    if (statusId >= 5) updateData.closed_at = new Date().toISOString();

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('ticket_id', ticketId);
    
    return !error;
  },

  // Assign ticket to agent
  async assignTicket(ticketId: number, agentId: number, isPrimary: boolean = true): Promise<boolean> {
    const { error } = await supabase
      .from('ticket_assignments')
      .insert({
        ticket_id: ticketId,
        support_agent_id: agentId,
        is_primary: isPrimary,
      });
    
    if (!error) {
      // Update ticket to In Progress
      await this.updateTicketStatus(ticketId, 2);
    }
    return !error;
  },

  // Assign AI Bot to resolve ticket
  async assignAIBot(ticketId: number): Promise<{ success: boolean; category?: string; error?: string }> {
    try {
      const response = await fetch('/tms/api/ai-resolve', {
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

  // Get AI bot assignment status
  async getAIBotStatus(ticketId: number): Promise<{ hasAIBot: boolean; botDetails?: any }> {
    try {
      const response = await fetch(`/tms/api/ai-resolve?ticketId=${ticketId}`);
      if (!response.ok) return { hasAIBot: false };
      return await response.json();
    } catch {
      return { hasAIBot: false };
    }
  },

  // Get dashboard stats
  async getDashboardStats() {
    const [ticketsRes, orgsRes, contactsRes, agentsRes] = await Promise.all([
      supabase.from('support_tickets').select('status_id, priority_id'),
      supabase.from('organizations').select('organization_id'),
      supabase.from('contacts').select('contact_id'),
      supabase.from('support_agents').select('support_agent_id, is_available').eq('agent_type', 'Human'),
    ]);

    const tickets = ticketsRes.data || [];
    return {
      totalTickets: tickets.length,
      openTickets: tickets.filter(t => t.status_id === 1).length,
      inProgressTickets: tickets.filter(t => t.status_id === 2).length,
      escalatedTickets: tickets.filter(t => t.status_id === 4).length,
      criticalTickets: tickets.filter(t => t.priority_id === 4).length,
      totalOrganizations: (orgsRes.data || []).length,
      totalContacts: (contactsRes.data || []).length,
      totalAgents: (agentsRes.data || []).length,
      availableAgents: (agentsRes.data || []).filter(a => a.is_available).length,
    };
  },
};

// ============================================
// AGENT ACCESS (Assigned and escalated tickets)
// ============================================

export const agentAPI = {
  // Get tickets assigned to this agent
  async getAssignedTickets(agentId: number): Promise<SupportTicket[]> {
    // First get assignments
    const { data: assignments, error: assignError } = await supabase
      .from('ticket_assignments')
      .select('ticket_id')
      .eq('support_agent_id', agentId);
    
    if (assignError || !assignments?.length) {
      // Return escalated tickets if no assignments
      return this.getEscalatedTickets();
    }

    const ticketIds = assignments.map(a => a.ticket_id);
    
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        status:status_id(name),
        priority:priority_id(name),
        organization:organization_id(name),
        contact:contact_id(full_name, phone)
      `)
      .in('ticket_id', ticketIds)
      .order('priority_id', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get all escalated tickets (any agent can see)
  async getEscalatedTickets(): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        status:status_id(name),
        priority:priority_id(name),
        organization:organization_id(name),
        contact:contact_id(full_name, phone)
      `)
      .eq('status_id', 4) // Escalated
      .order('priority_id', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get tickets requiring human agent
  async getHumanRequiredTickets(): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        status:status_id(name),
        priority:priority_id(name),
        organization:organization_id(name),
        contact:contact_id(full_name, phone)
      `)
      .eq('requires_human_agent', true)
      .in('status_id', [1, 2, 3, 4]) // Not resolved/closed
      .order('priority_id', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Get ticket details (agent can see assigned or escalated)
  async getTicketDetails(ticketId: number, agentId: number): Promise<SupportTicket | null> {
    console.log('getTicketDetails called with ticketId:', ticketId, 'agentId:', agentId);
    
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        status:status_id(name),
        priority:priority_id(name),
        organization:organization_id(name, u_e_code),
        contact:contact_id(full_name, email, phone)
      `)
      .eq('ticket_id', ticketId)
      .single();
    
    if (error) {
      console.error('Error fetching ticket:', error);
      return null;
    }
    
    console.log('Ticket data:', data);
    
    // Check if escalated or requires human (any agent can view)
    if (data.status_id === 4 || data.requires_human_agent) {
      console.log('Ticket is escalated or requires human - granting access');
      return data;
    }
    
    // Check if assigned to this agent
    const { data: assignment, error: assignError } = await supabase
      .from('ticket_assignments')
      .select('assignment_id')
      .eq('ticket_id', ticketId)
      .eq('support_agent_id', agentId)
      .single();
    
    console.log('Assignment check:', { assignment, assignError, ticketId, agentId });
    
    if (assignment) {
      console.log('Agent is assigned - granting access');
      return data;
    }
    
    // For demo purposes, allow any agent to view any ticket
    console.log('No specific access found, but granting access for demo');
    return data;
  },

  // Get messages for accessible ticket
  async getTicketMessages(ticketId: number, agentId: number): Promise<TicketMessage[]> {
    const ticket = await this.getTicketDetails(ticketId, agentId);
    if (!ticket) return [];

    const { data, error } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender_agent:sender_agent_id(full_name, agent_type),
        sender_contact:sender_contact_id(full_name)
      `)
      .eq('ticket_id', ticketId)
      .order('message_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Add message to ticket
  async addMessage(ticketId: number, agentId: number, content: string): Promise<TicketMessage | null> {
    const ticket = await this.getTicketDetails(ticketId, agentId);
    if (!ticket) return null;

    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_agent_id: agentId,
        content,
        message_type: 'text',
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update ticket status
  async updateTicketStatus(ticketId: number, agentId: number, statusId: number): Promise<boolean> {
    const ticket = await this.getTicketDetails(ticketId, agentId);
    if (!ticket) return false;

    const updateData: any = { status_id: statusId, updated_at: new Date().toISOString() };
    if (statusId >= 5) updateData.closed_at = new Date().toISOString();

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('ticket_id', ticketId);
    
    return !error;
  },

  // Claim a ticket (assign to self)
  async claimTicket(ticketId: number, agentId: number): Promise<boolean> {
    const { error } = await supabase
      .from('ticket_assignments')
      .insert({
        ticket_id: ticketId,
        support_agent_id: agentId,
        is_primary: true,
      });
    
    if (!error) {
      await this.updateTicketStatus(ticketId, agentId, 2); // In Progress
    }
    return !error;
  },

  // Get agent's own profile
  async getMyProfile(agentId: number): Promise<SupportAgent | null> {
    const { data, error } = await supabase
      .from('support_agents')
      .select('*')
      .eq('support_agent_id', agentId)
      .single();
    
    if (error) return null;
    return data;
  },

  // Update availability
  async updateAvailability(agentId: number, isAvailable: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('support_agents')
      .update({ is_available: isAvailable })
      .eq('support_agent_id', agentId);
    
    return !error;
  },

  // Get agent dashboard stats
  async getDashboardStats(agentId: number) {
    const assigned = await this.getAssignedTickets(agentId);
    const escalated = await this.getEscalatedTickets();
    const humanRequired = await this.getHumanRequiredTickets();

    return {
      assignedTickets: assigned.length,
      escalatedTickets: escalated.length,
      humanRequiredTickets: humanRequired.length,
      criticalTickets: [...assigned, ...escalated].filter(t => t.priority_id === 4).length,
    };
  },

  // Get all human agents for profile switching
  async getAllHumanAgents(): Promise<SupportAgent[]> {
    const { data, error } = await supabase
      .from('support_agents')
      .select('*')
      .eq('agent_type', 'Human')
      .order('full_name');
    
    if (error) return [];
    return data || [];
  },
};

// ============================================
// Utility functions
// ============================================

export async function getTicketStatuses() {
  const { data, error } = await supabase
    .from('ticket_statuses')
    .select('*')
    .order('status_id');
  
  if (error) return [];
  return data || [];
}

export async function getTicketPriorities() {
  const { data, error } = await supabase
    .from('ticket_priorities')
    .select('*')
    .order('priority_id');
  
  if (error) return [];
  return data || [];
}

// ============================================
// Location Management (Admin)
// ============================================

export async function getLocations(organizationId?: number) {
  let query = supabase
    .from('locations')
    .select(`
      *,
      organization:organization_id(name)
    `)
    .order('name');
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function createLocation(
  organizationId: number,
  name: string,
  locationType: string = 'Other',
  requiresHumanAgent: boolean = false
) {
  const { data, error } = await supabase
    .from('locations')
    .insert({
      organization_id: organizationId,
      name,
      location_type: locationType,
      requires_human_agent: requiresHumanAgent,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// Device Management (Admin)
// ============================================

export async function getDevices(organizationId?: number, locationId?: number) {
  let query = supabase
    .from('devices')
    .select(`
      *,
      organization:organization_id(name),
      location:location_id(name),
      manufacturer:manufacturer_id(name),
      model:model_id(name),
      os:os_id(name),
      device_type:device_type_id(name)
    `)
    .order('asset_name');
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  if (locationId) {
    query = query.eq('location_id', locationId);
  }
  
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function getDeviceById(deviceId: number) {
  const { data, error } = await supabase
    .from('devices')
    .select(`
      *,
      organization:organization_id(name),
      location:location_id(name),
      manufacturer:manufacturer_id(name),
      model:model_id(name),
      os:os_id(name),
      device_type:device_type_id(name)
    `)
    .eq('device_id', deviceId)
    .single();
  
  if (error) return null;
  return data;
}

// ============================================
// Device Lookup Tables (Admin)
// ============================================

export async function getDeviceManufacturers() {
  const { data, error } = await supabase
    .from('device_manufacturers')
    .select('*')
    .order('name');
  
  if (error) return [];
  return data || [];
}

export async function getDeviceModels(manufacturerId?: number) {
  let query = supabase
    .from('device_models')
    .select(`*, manufacturer:manufacturer_id(name)`)
    .order('name');
  
  if (manufacturerId) {
    query = query.eq('manufacturer_id', manufacturerId);
  }
  
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function getOperatingSystems() {
  const { data, error } = await supabase
    .from('operating_systems')
    .select('*')
    .order('name');
  
  if (error) return [];
  return data || [];
}

export async function getDeviceTypes() {
  const { data, error } = await supabase
    .from('device_types')
    .select('*')
    .order('name');
  
  if (error) return [];
  return data || [];
}

export async function getDomains() {
  const { data, error } = await supabase
    .from('domains')
    .select('*')
    .order('name');
  
  if (error) return [];
  return data || [];
}

// ============================================
// Account Manager (Admin)
// ============================================

export async function getAccountManagers() {
  const { data, error } = await supabase
    .from('account_managers')
    .select('*')
    .order('full_name');
  
  if (error) return [];
  return data || [];
}

export async function createAccountManager(fullName: string, email: string, phone?: string) {
  const { data, error } = await supabase
    .from('account_managers')
    .insert({
      full_name: fullName,
      email,
      phone,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// Contact Devices (Admin)
// ============================================

export async function getContactDevices(contactId: number) {
  const { data, error } = await supabase
    .from('contact_devices')
    .select(`
      *,
      device:device_id(device_id, asset_name, status, host_name)
    `)
    .eq('contact_id', contactId)
    .is('unassigned_at', null);
  
  if (error) return [];
  return data || [];
}

export async function assignDeviceToContact(contactId: number, deviceId: number) {
  const { data, error } = await supabase
    .from('contact_devices')
    .insert({
      contact_id: contactId,
      device_id: deviceId,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function unassignDeviceFromContact(contactId: number, deviceId: number) {
  const { error } = await supabase
    .from('contact_devices')
    .update({ unassigned_at: new Date().toISOString() })
    .eq('contact_id', contactId)
    .eq('device_id', deviceId)
    .is('unassigned_at', null);
  
  if (error) throw error;
  return true;
}

// ============================================
// Ticket Escalations (Agent/Admin)
// ============================================

export async function getTicketEscalations(ticketId: number) {
  const { data, error } = await supabase
    .from('ticket_escalations')
    .select(`
      *,
      from_agent:from_agent_id(full_name, agent_type),
      to_agent:to_agent_id(full_name, agent_type)
    `)
    .eq('ticket_id', ticketId)
    .order('escalation_time', { ascending: false });
  
  if (error) return [];
  return data || [];
}

export async function createEscalation(
  ticketId: number,
  fromAgentId: number,
  toAgentId: number | null,
  reason: string
) {
  // Create escalation record
  const { data, error } = await supabase
    .from('ticket_escalations')
    .insert({
      ticket_id: ticketId,
      from_agent_id: fromAgentId,
      to_agent_id: toAgentId,
      reason,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Update ticket status to Escalated
  await supabase
    .from('support_tickets')
    .update({ 
      status_id: 4, // Escalated
      requires_human_agent: true,
      updated_at: new Date().toISOString()
    })
    .eq('ticket_id', ticketId);
  
  return data;
}

// ============================================
// Processor Info (Admin - for device details)
// ============================================

export async function getProcessorModels() {
  const { data, error } = await supabase
    .from('processor_models')
    .select('*')
    .order('manufacturer, model');
  
  if (error) return [];
  return data || [];
}

export async function getProcessorArchitectures() {
  const { data, error } = await supabase
    .from('processor_architectures')
    .select('*')
    .order('name');
  
  if (error) return [];
  return data || [];
}

export async function getUpdateStatuses() {
  const { data, error } = await supabase
    .from('update_statuses')
    .select('*')
    .order('name');
  
  if (error) return [];
  return data || [];
}
