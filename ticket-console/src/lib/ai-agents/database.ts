// Database Access Functions for AI Bots
// Uses direct PostgreSQL via pg pool

import { queryOne, queryMany, query } from '@/lib/db';

// Get full contact details
export async function getContactDetails(contactId: number) {
  return queryOne(
    `SELECT c.*,
      json_build_object('name', o.name, 'u_e_code', o.u_e_code, 'description', o.description) as organization
    FROM contacts c
    LEFT JOIN organizations o ON c.organization_id = o.organization_id
    WHERE c.contact_id = $1`,
    [contactId]
  );
}

// Get organization details with manager
export async function getOrganizationDetails(organizationId: number) {
  return queryOne(
    `SELECT o.*,
      json_build_object('full_name', am.full_name, 'email', am.email, 'phone', am.phone) as manager
    FROM organizations o
    LEFT JOIN account_managers am ON o.manager_id = am.manager_id
    WHERE o.organization_id = $1`,
    [organizationId]
  );
}

// Get devices for a contact/organization
export async function getDevicesForOrg(organizationId: number) {
  return queryMany(
    `SELECT d.*,
      json_build_object('name', loc.name) as location,
      json_build_object('name', dm.name) as manufacturer,
      json_build_object('name', dmod.name) as model,
      json_build_object('name', os.name) as os,
      json_build_object('name', dt.name) as device_type
    FROM devices d
    LEFT JOIN locations loc ON d.location_id = loc.location_id
    LEFT JOIN device_manufacturers dm ON d.manufacturer_id = dm.manufacturer_id
    LEFT JOIN device_models dmod ON d.model_id = dmod.model_id
    LEFT JOIN operating_systems os ON d.os_id = os.os_id
    LEFT JOIN device_types dt ON d.device_type_id = dt.device_type_id
    WHERE d.organization_id = $1
    ORDER BY d.asset_name`,
    [organizationId]
  );
}

// Get locations for an organization
export async function getLocationsForOrg(organizationId: number) {
  return queryMany(
    `SELECT * FROM locations WHERE organization_id = $1 ORDER BY name`,
    [organizationId]
  );
}

// Get ticket history for a contact
export async function getTicketHistory(contactId: number, limit: number = 5) {
  return queryMany(
    `SELECT t.ticket_id, t.subject, t.description, t.created_at, t.closed_at,
      json_build_object('name', ts.name) as status,
      json_build_object('name', tp.name) as priority
    FROM support_tickets t
    LEFT JOIN ticket_statuses ts ON t.status_id = ts.status_id
    LEFT JOIN ticket_priorities tp ON t.priority_id = tp.priority_id
    WHERE t.contact_id = $1
    ORDER BY t.created_at DESC
    LIMIT $2`,
    [contactId, limit]
  );
}

// Get all ticket statuses
export async function getTicketStatuses() {
  return queryMany(`SELECT * FROM ticket_statuses ORDER BY status_id`);
}

// Get all ticket priorities
export async function getTicketPriorities() {
  return queryMany(`SELECT * FROM ticket_priorities ORDER BY priority_id`);
}

// Update ticket priority
export async function updateTicketPriority(ticketId: number, priorityId: number) {
  const result = await query(
    `UPDATE support_tickets SET priority_id = $1, updated_at = $2 WHERE ticket_id = $3`,
    [priorityId, new Date().toISOString(), ticketId]
  );
  return (result.rowCount ?? 0) > 0;
}

// Add internal note to ticket
export async function addInternalNote(ticketId: number, agentId: number, content: string) {
  return queryOne(
    `INSERT INTO ticket_messages (ticket_id, sender_agent_id, content, message_type)
    VALUES ($1, $2, $3, 'internal_note')
    RETURNING *`,
    [ticketId, agentId, content]
  );
}

// Search knowledge base articles (if exists)
export async function searchKnowledgeBase(searchTerm: string) {
  try {
    return await queryMany(
      `SELECT * FROM knowledge_articles
      WHERE title ILIKE $1 OR content ILIKE $1
      LIMIT 5`,
      [`%${searchTerm}%`]
    );
  } catch {
    return [];
  }
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
    if (organization.manager?.full_name) context += `Account Manager: ${organization.manager.full_name}\n`;
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
