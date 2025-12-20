// Database Access Functions for AI Bots
// Provides same access level as human agents

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get full contact details
export async function getContactDetails(contactId: number) {
  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      organization:organization_id(name, u_e_code, description)
    `)
    .eq('contact_id', contactId)
    .single();
  
  if (error) return null;
  return data;
}

// Get organization details
export async function getOrganizationDetails(organizationId: number) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('organization_id', organizationId)
    .single();
  
  if (error) return null;
  return data;
}

// Get devices for a contact/organization
export async function getDevicesForOrg(organizationId: number) {
  const { data, error } = await supabase
    .from('devices')
    .select(`
      *,
      location:location_id(name),
      manufacturer:manufacturer_id(name),
      model:model_id(name),
      os:os_id(name),
      device_type:device_type_id(name)
    `)
    .eq('organization_id', organizationId)
    .order('asset_name');
  
  if (error) return [];
  return data || [];
}

// Get locations for an organization
export async function getLocationsForOrg(organizationId: number) {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');
  
  if (error) return [];
  return data || [];
}

// Get ticket history for a contact
export async function getTicketHistory(contactId: number, limit: number = 5) {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      ticket_id,
      subject,
      description,
      status:status_id(name),
      priority:priority_id(name),
      created_at,
      closed_at
    `)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) return [];
  return data || [];
}

// Get all ticket statuses
export async function getTicketStatuses() {
  const { data, error } = await supabase
    .from('ticket_statuses')
    .select('*')
    .order('status_id');
  
  if (error) return [];
  return data || [];
}

// Get all ticket priorities
export async function getTicketPriorities() {
  const { data, error } = await supabase
    .from('ticket_priorities')
    .select('*')
    .order('priority_id');
  
  if (error) return [];
  return data || [];
}

// Update ticket priority
export async function updateTicketPriority(ticketId: number, priorityId: number) {
  const { error } = await supabase
    .from('support_tickets')
    .update({ priority_id: priorityId, updated_at: new Date().toISOString() })
    .eq('ticket_id', ticketId);
  
  return !error;
}

// Add internal note to ticket
export async function addInternalNote(ticketId: number, agentId: number, content: string) {
  const { data, error } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_agent_id: agentId,
      content,
      message_type: 'internal_note',
    })
    .select()
    .single();
  
  if (error) return null;
  return data;
}

// Search knowledge base articles (if exists)
export async function searchKnowledgeBase(searchTerm: string) {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .select('*')
    .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
    .limit(5);
  
  if (error) return [];
  return data || [];
}

// Build context for AI with full database access
export async function buildTicketContext(ticket: any): Promise<string> {
  const contactId = ticket.contact_id;
  const organizationId = ticket.organization_id;

  // Gather all relevant data in parallel
  const [contact, organization, devices, locations, ticketHistory] = await Promise.all([
    getContactDetails(contactId),
    getOrganizationDetails(organizationId),
    getDevicesForOrg(organizationId),
    getLocationsForOrg(organizationId),
    getTicketHistory(contactId),
  ]);

  let context = `\n=== CUSTOMER CONTEXT ===\n`;
  
  if (contact) {
    context += `Customer: ${contact.full_name}\n`;
    context += `Email: ${contact.email || 'N/A'}\n`;
    context += `Phone: ${contact.phone || 'N/A'}\n`;
  }

  if (organization) {
    context += `\nOrganization: ${organization.name}\n`;
    if (organization.u_e_code) context += `Company Code: ${organization.u_e_code}\n`;
  }

  if (devices && devices.length > 0) {
    context += `\nRegistered Devices (${devices.length}):\n`;
    devices.slice(0, 5).forEach((d: any) => {
      context += `- ${d.asset_name || 'Unknown'}: ${d.device_type?.name || ''} ${d.manufacturer?.name || ''} ${d.model?.name || ''} (${d.os?.name || 'Unknown OS'})\n`;
    });
    if (devices.length > 5) context += `  ... and ${devices.length - 5} more devices\n`;
  }

  if (locations && locations.length > 0) {
    context += `\nLocations:\n`;
    locations.forEach((l: any) => {
      context += `- ${l.name} (${l.location_type || 'Office'})\n`;
    });
  }

  if (ticketHistory && ticketHistory.length > 0) {
    context += `\nRecent Ticket History:\n`;
    ticketHistory.forEach((t: any) => {
      context += `- [${t.status?.name || 'Unknown'}] ${t.subject} (${new Date(t.created_at).toLocaleDateString()})\n`;
    });
  }

  return context;
}

// Export the supabase client for use in other modules
export { supabase };
