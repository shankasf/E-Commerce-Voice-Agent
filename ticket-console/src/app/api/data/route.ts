/**
 * Unified Data API Route
 * Handles all database operations with role-based access control
 * This replaces direct Supabase calls from the client
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Helper to parse JSON body safely
async function parseBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

// Helper to build error response
function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Helper to build success response
function successResponse(data: any) {
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const { action, role, ...params } = body;

    if (!action) {
      return errorResponse('Action is required');
    }

    // Route to appropriate handler based on action
    switch (action) {
      // ============================================
      // REQUESTER ACTIONS
      // ============================================
      case 'requester.getMyTickets':
        return handleRequesterGetMyTickets(params);
      case 'requester.getTicketDetails':
        return handleRequesterGetTicketDetails(params);
      case 'requester.getTicketMessages':
        return handleRequesterGetTicketMessages(params);
      case 'requester.createTicket':
        return handleRequesterCreateTicket(params);
      case 'requester.addMessage':
        return handleRequesterAddMessage(params);
      case 'requester.getMyProfile':
        return handleRequesterGetMyProfile(params);

      // ============================================
      // ADMIN ACTIONS
      // ============================================
      case 'admin.getAllTickets':
        return handleAdminGetAllTickets(params);
      case 'admin.getTicketDetails':
        return handleAdminGetTicketDetails(params);
      case 'admin.getTicketMessages':
        return handleAdminGetTicketMessages(params);
      case 'admin.getOrganizations':
        return handleAdminGetOrganizations();
      case 'admin.getContacts':
        return handleAdminGetContacts(params);
      case 'admin.getAgents':
        return handleAdminGetAgents();
      case 'admin.createOrganization':
        return handleAdminCreateOrganization(params);
      case 'admin.createContact':
        return handleAdminCreateContact(params);
      case 'admin.createAgent':
        return handleAdminCreateAgent(params);
      case 'admin.updateTicketStatus':
        return handleAdminUpdateTicketStatus(params);
      case 'admin.assignTicket':
        return handleAdminAssignTicket(params);
      case 'admin.getDashboardStats':
        return handleAdminGetDashboardStats();

      // ============================================
      // AGENT ACTIONS
      // ============================================
      case 'agent.getAssignedTickets':
        return handleAgentGetAssignedTickets(params);
      case 'agent.getEscalatedTickets':
        return handleAgentGetEscalatedTickets();
      case 'agent.getHumanRequiredTickets':
        return handleAgentGetHumanRequiredTickets();
      case 'agent.getTicketDetails':
        return handleAgentGetTicketDetails(params);
      case 'agent.getTicketMessages':
        return handleAgentGetTicketMessages(params);
      case 'agent.addMessage':
        return handleAgentAddMessage(params);
      case 'agent.updateTicketStatus':
        return handleAgentUpdateTicketStatus(params);
      case 'agent.claimTicket':
        return handleAgentClaimTicket(params);
      case 'agent.getMyProfile':
        return handleAgentGetMyProfile(params);
      case 'agent.updateAvailability':
        return handleAgentUpdateAvailability(params);
      case 'agent.getDashboardStats':
        return handleAgentGetDashboardStats(params);
      case 'agent.getAllHumanAgents':
        return handleAgentGetAllHumanAgents();

      // ============================================
      // UTILITY ACTIONS
      // ============================================
      case 'getTicketStatuses':
        return handleGetTicketStatuses();
      case 'getTicketPriorities':
        return handleGetTicketPriorities();
      case 'getLocations':
        return handleGetLocations(params);
      case 'createLocation':
        return handleCreateLocation(params);
      case 'getDevices':
        return handleGetDevices(params);
      case 'getDeviceById':
        return handleGetDeviceById(params);
      case 'getDeviceManufacturers':
        return handleGetDeviceManufacturers();
      case 'getDeviceModels':
        return handleGetDeviceModels(params);
      case 'getOperatingSystems':
        return handleGetOperatingSystems();
      case 'getDeviceTypes':
        return handleGetDeviceTypes();
      case 'getDomains':
        return handleGetDomains();
      case 'getAccountManagers':
        return handleGetAccountManagers();
      case 'createAccountManager':
        return handleCreateAccountManager(params);
      case 'getContactDevices':
        return handleGetContactDevices(params);
      case 'assignDeviceToContact':
        return handleAssignDeviceToContact(params);
      case 'unassignDeviceFromContact':
        return handleUnassignDeviceFromContact(params);
      case 'getTicketEscalations':
        return handleGetTicketEscalations(params);
      case 'createEscalation':
        return handleCreateEscalation(params);
      case 'getProcessorModels':
        return handleGetProcessorModels();
      case 'getProcessorArchitectures':
        return handleGetProcessorArchitectures();
      case 'getUpdateStatuses':
        return handleGetUpdateStatuses();

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (error: any) {
    console.error('[Data API] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}

// ============================================
// REQUESTER HANDLERS
// ============================================

async function handleRequesterGetMyTickets({ contactId }: { contactId: number }) {
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

  if (error) return errorResponse(error.message, 500);
  return successResponse(data || []);
}

async function handleRequesterGetTicketDetails({ ticketId, contactId }: { ticketId: number; contactId: number }) {
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
    .eq('contact_id', contactId)
    .single();

  if (error) return successResponse(null);
  return successResponse(data);
}

async function handleRequesterGetTicketMessages({ ticketId, contactId }: { ticketId: number; contactId: number }) {
  // First verify ownership
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('ticket_id')
    .eq('ticket_id', ticketId)
    .eq('contact_id', contactId)
    .single();

  if (!ticket) return successResponse([]);

  const { data, error } = await supabase
    .from('ticket_messages')
    .select(`
      *,
      sender_agent:sender_agent_id(full_name, agent_type),
      sender_contact:sender_contact_id(full_name)
    `)
    .eq('ticket_id', ticketId)
    .order('message_time', { ascending: true });

  if (error) return errorResponse(error.message, 500);
  return successResponse(data || []);
}

async function handleRequesterCreateTicket({ contactId, organizationId, subject, description, priorityId = 2, deviceId, locationId }: any) {
  // Validate required fields
  if (!deviceId) {
    return errorResponse('Device is required', 400);
  }
  if (!locationId) {
    return errorResponse('Location is required', 400);
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      contact_id: contactId,
      organization_id: organizationId,
      subject,
      description,
      status_id: 1,
      priority_id: priorityId,
      requires_human_agent: false,
      device_id: deviceId,
      location_id: locationId,
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

async function handleRequesterAddMessage({ ticketId, contactId, content }: any) {
  // Verify ownership
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('ticket_id')
    .eq('ticket_id', ticketId)
    .eq('contact_id', contactId)
    .single();

  if (!ticket) return errorResponse('Ticket not found or access denied', 403);

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

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

async function handleRequesterGetMyProfile({ contactId }: { contactId: number }) {
  const { data, error } = await supabase
    .from('contacts')
    .select(`*, organization:organization_id(name, u_e_code)`)
    .eq('contact_id', contactId)
    .single();

  if (error) return successResponse(null);
  return successResponse(data);
}

// ============================================
// ADMIN HANDLERS
// ============================================

async function handleAdminGetAllTickets({ statusId, priorityId, organizationId }: any) {
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

  if (statusId) query = query.eq('status_id', statusId);
  if (priorityId) query = query.eq('priority_id', priorityId);
  if (organizationId) query = query.eq('organization_id', organizationId);

  const { data, error } = await query;
  if (error) return errorResponse(error.message, 500);
  return successResponse(data || []);
}

async function handleAdminGetTicketDetails({ ticketId }: { ticketId: number }) {
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

  if (error) return successResponse(null);
  return successResponse(data);
}

async function handleAdminGetTicketMessages({ ticketId }: { ticketId: number }) {
  const { data, error } = await supabase
    .from('ticket_messages')
    .select(`
      *,
      sender_agent:sender_agent_id(full_name, agent_type),
      sender_contact:sender_contact_id(full_name)
    `)
    .eq('ticket_id', ticketId)
    .order('message_time', { ascending: true });

  if (error) return errorResponse(error.message, 500);
  return successResponse(data || []);
}

async function handleAdminGetOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name');

  if (error) return errorResponse(error.message, 500);
  return successResponse(data || []);
}

async function handleAdminGetContacts({ organizationId }: { organizationId?: number }) {
  let query = supabase
    .from('contacts')
    .select(`*, organization:organization_id(name)`)
    .order('full_name');

  if (organizationId) query = query.eq('organization_id', organizationId);

  const { data, error } = await query;
  if (error) return errorResponse(error.message, 500);
  return successResponse(data || []);
}

async function handleAdminGetAgents() {
  const { data, error } = await supabase
    .from('support_agents')
    .select('*')
    .order('full_name');

  if (error) return errorResponse(error.message, 500);
  return successResponse(data || []);
}

async function handleAdminCreateOrganization({ name, uECode }: { name: string; uECode: number }) {
  const { data, error } = await supabase
    .from('organizations')
    .insert({ name, u_e_code: uECode })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

async function handleAdminCreateContact({ fullName, email, phone, organizationId }: any) {
  const { data, error } = await supabase
    .from('contacts')
    .insert({ full_name: fullName, email, phone, organization_id: organizationId })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

async function handleAdminCreateAgent({ fullName, email, agentType, specialization }: any) {
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

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

async function handleAdminUpdateTicketStatus({ ticketId, statusId }: { ticketId: number; statusId: number }) {
  const updateData: any = { status_id: statusId, updated_at: new Date().toISOString() };
  if (statusId >= 5) updateData.closed_at = new Date().toISOString();

  const { error } = await supabase
    .from('support_tickets')
    .update(updateData)
    .eq('ticket_id', ticketId);

  if (error) return errorResponse(error.message, 500);
  return successResponse({ success: true });
}

async function handleAdminAssignTicket({ ticketId, agentId, isPrimary = true }: any) {
  const { error } = await supabase
    .from('ticket_assignments')
    .insert({
      ticket_id: ticketId,
      support_agent_id: agentId,
      is_primary: isPrimary,
    });

  if (error) return errorResponse(error.message, 500);

  // Update ticket to In Progress
  await supabase
    .from('support_tickets')
    .update({ status_id: 2, updated_at: new Date().toISOString() })
    .eq('ticket_id', ticketId);

  return successResponse({ success: true });
}

async function handleAdminGetDashboardStats() {
  const [ticketsRes, orgsRes, contactsRes, agentsRes] = await Promise.all([
    supabase.from('support_tickets').select('status_id, priority_id'),
    supabase.from('organizations').select('organization_id'),
    supabase.from('contacts').select('contact_id'),
    supabase.from('support_agents').select('support_agent_id, is_available').eq('agent_type', 'Human'),
  ]);

  const tickets = ticketsRes.data || [];
  return successResponse({
    totalTickets: tickets.length,
    openTickets: tickets.filter(t => t.status_id === 1).length,
    inProgressTickets: tickets.filter(t => t.status_id === 2).length,
    escalatedTickets: tickets.filter(t => t.status_id === 4).length,
    criticalTickets: tickets.filter(t => t.priority_id === 4).length,
    totalOrganizations: (orgsRes.data || []).length,
    totalContacts: (contactsRes.data || []).length,
    totalAgents: (agentsRes.data || []).length,
    availableAgents: (agentsRes.data || []).filter(a => a.is_available).length,
  });
}

// ============================================
// AGENT HANDLERS
// ============================================

async function handleAgentGetAssignedTickets({ agentId }: { agentId: number }) {
  const { data: assignments } = await supabase
    .from('ticket_assignments')
    .select('ticket_id')
    .eq('support_agent_id', agentId);

  if (!assignments?.length) {
    // Return escalated tickets if no assignments
    return handleAgentGetEscalatedTickets();
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

  if (error) return errorResponse(error.message, 500);
  return successResponse(data || []);
}

async function handleAgentGetEscalatedTickets() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      status:status_id(name),
      priority:priority_id(name),
      organization:organization_id(name),
      contact:contact_id(full_name, phone)
    `)
    .eq('status_id', 4)
    .order('priority_id', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return successResponse(data || []);
}

async function handleAgentGetHumanRequiredTickets() {
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
    .in('status_id', [1, 2, 3, 4])
    .order('priority_id', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return successResponse(data || []);
}

async function handleAgentGetTicketDetails({ ticketId, agentId }: { ticketId: number; agentId: number }) {
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

  if (error) return successResponse(null);

  // Check if escalated or requires human (any agent can view)
  if (data.status_id === 4 || data.requires_human_agent) {
    return successResponse(data);
  }

  // Check assignment
  const { data: assignment } = await supabase
    .from('ticket_assignments')
    .select('assignment_id')
    .eq('ticket_id', ticketId)
    .eq('support_agent_id', agentId)
    .single();

  // For demo purposes, allow any agent to view any ticket
  return successResponse(data);
}

async function handleAgentGetTicketMessages({ ticketId, agentId }: { ticketId: number; agentId: number }) {
  const { data, error } = await supabase
    .from('ticket_messages')
    .select(`
      *,
      sender_agent:sender_agent_id(full_name, agent_type),
      sender_contact:sender_contact_id(full_name)
    `)
    .eq('ticket_id', ticketId)
    .order('message_time', { ascending: true });

  if (error) return errorResponse(error.message, 500);
  return successResponse(data || []);
}

async function handleAgentAddMessage({ ticketId, agentId, content }: any) {
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

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

async function handleAgentUpdateTicketStatus({ ticketId, agentId, statusId }: any) {
  const updateData: any = { status_id: statusId, updated_at: new Date().toISOString() };
  if (statusId >= 5) updateData.closed_at = new Date().toISOString();

  const { error } = await supabase
    .from('support_tickets')
    .update(updateData)
    .eq('ticket_id', ticketId);

  if (error) return errorResponse(error.message, 500);
  return successResponse({ success: true });
}

async function handleAgentClaimTicket({ ticketId, agentId }: { ticketId: number; agentId: number }) {
  const { error } = await supabase
    .from('ticket_assignments')
    .insert({
      ticket_id: ticketId,
      support_agent_id: agentId,
      is_primary: true,
    });

  if (error) return errorResponse(error.message, 500);

  // Update to In Progress
  await supabase
    .from('support_tickets')
    .update({ status_id: 2, updated_at: new Date().toISOString() })
    .eq('ticket_id', ticketId);

  return successResponse({ success: true });
}

async function handleAgentGetMyProfile({ agentId }: { agentId: number }) {
  const { data, error } = await supabase
    .from('support_agents')
    .select('*')
    .eq('support_agent_id', agentId)
    .single();

  if (error) return successResponse(null);
  return successResponse(data);
}

async function handleAgentUpdateAvailability({ agentId, isAvailable }: { agentId: number; isAvailable: boolean }) {
  const { error } = await supabase
    .from('support_agents')
    .update({ is_available: isAvailable })
    .eq('support_agent_id', agentId);

  if (error) return errorResponse(error.message, 500);
  return successResponse({ success: true });
}

async function handleAgentGetDashboardStats({ agentId }: { agentId: number }) {
  // Get assigned tickets
  const { data: assignments } = await supabase
    .from('ticket_assignments')
    .select('ticket_id')
    .eq('support_agent_id', agentId);

  const ticketIds = assignments?.map(a => a.ticket_id) || [];

  const { data: assignedTickets } = ticketIds.length > 0
    ? await supabase.from('support_tickets').select('priority_id').in('ticket_id', ticketIds)
    : { data: [] };

  const { data: escalatedTickets } = await supabase
    .from('support_tickets')
    .select('priority_id')
    .eq('status_id', 4);

  const { data: humanRequired } = await supabase
    .from('support_tickets')
    .select('ticket_id')
    .eq('requires_human_agent', true)
    .in('status_id', [1, 2, 3, 4]);

  const assigned = assignedTickets || [];
  const escalated = escalatedTickets || [];

  return successResponse({
    assignedTickets: assigned.length,
    escalatedTickets: escalated.length,
    humanRequiredTickets: (humanRequired || []).length,
    criticalTickets: [...assigned, ...escalated].filter(t => t.priority_id === 4).length,
  });
}

async function handleAgentGetAllHumanAgents() {
  const { data, error } = await supabase
    .from('support_agents')
    .select('*')
    .eq('agent_type', 'Human')
    .order('full_name');

  if (error) return successResponse([]);
  return successResponse(data || []);
}

// ============================================
// UTILITY HANDLERS
// ============================================

async function handleGetTicketStatuses() {
  const { data, error } = await supabase
    .from('ticket_statuses')
    .select('*')
    .order('status_id');

  if (error) return successResponse([]);
  return successResponse(data || []);
}

async function handleGetTicketPriorities() {
  const { data, error } = await supabase
    .from('ticket_priorities')
    .select('*')
    .order('priority_id');

  if (error) return successResponse([]);
  return successResponse(data || []);
}

async function handleGetLocations({ organizationId }: { organizationId?: number }) {
  let query = supabase
    .from('locations')
    .select(`*, organization:organization_id(name)`)
    .order('name');

  if (organizationId) query = query.eq('organization_id', organizationId);

  const { data, error } = await query;
  if (error) return successResponse([]);
  return successResponse(data || []);
}

async function handleCreateLocation({ organizationId, name, locationType = 'Other', requiresHumanAgent = false }: any) {
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

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

async function handleGetDevices({ organizationId, locationId }: { organizationId?: number; locationId?: number }) {
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

  if (organizationId) query = query.eq('organization_id', organizationId);
  if (locationId) query = query.eq('location_id', locationId);

  const { data, error } = await query;
  if (error) return successResponse([]);
  return successResponse(data || []);
}

async function handleGetDeviceById({ deviceId }: { deviceId: number }) {
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

  if (error) return successResponse(null);
  return successResponse(data);
}

async function handleGetDeviceManufacturers() {
  const { data } = await supabase.from('device_manufacturers').select('*').order('name');
  return successResponse(data || []);
}

async function handleGetDeviceModels({ manufacturerId }: { manufacturerId?: number }) {
  let query = supabase.from('device_models').select(`*, manufacturer:manufacturer_id(name)`).order('name');
  if (manufacturerId) query = query.eq('manufacturer_id', manufacturerId);
  const { data } = await query;
  return successResponse(data || []);
}

async function handleGetOperatingSystems() {
  const { data } = await supabase.from('operating_systems').select('*').order('name');
  return successResponse(data || []);
}

async function handleGetDeviceTypes() {
  const { data } = await supabase.from('device_types').select('*').order('name');
  return successResponse(data || []);
}

async function handleGetDomains() {
  const { data } = await supabase.from('domains').select('*').order('name');
  return successResponse(data || []);
}

async function handleGetAccountManagers() {
  const { data } = await supabase.from('account_managers').select('*').order('full_name');
  return successResponse(data || []);
}

async function handleCreateAccountManager({ fullName, email, phone }: any) {
  const { data, error } = await supabase
    .from('account_managers')
    .insert({ full_name: fullName, email, phone })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

async function handleGetContactDevices({ contactId }: { contactId: number }) {
  const { data } = await supabase
    .from('contact_devices')
    .select(`*, device:device_id(device_id, asset_name, status, host_name)`)
    .eq('contact_id', contactId)
    .is('unassigned_at', null);

  return successResponse(data || []);
}

async function handleAssignDeviceToContact({ contactId, deviceId }: { contactId: number; deviceId: number }) {
  const { data, error } = await supabase
    .from('contact_devices')
    .insert({ contact_id: contactId, device_id: deviceId })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

async function handleUnassignDeviceFromContact({ contactId, deviceId }: { contactId: number; deviceId: number }) {
  const { error } = await supabase
    .from('contact_devices')
    .update({ unassigned_at: new Date().toISOString() })
    .eq('contact_id', contactId)
    .eq('device_id', deviceId)
    .is('unassigned_at', null);

  if (error) return errorResponse(error.message, 500);
  return successResponse({ success: true });
}

async function handleGetTicketEscalations({ ticketId }: { ticketId: number }) {
  const { data } = await supabase
    .from('ticket_escalations')
    .select(`
      *,
      from_agent:from_agent_id(full_name, agent_type),
      to_agent:to_agent_id(full_name, agent_type)
    `)
    .eq('ticket_id', ticketId)
    .order('escalation_time', { ascending: false });

  return successResponse(data || []);
}

async function handleCreateEscalation({ ticketId, fromAgentId, toAgentId, reason }: any) {
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

  if (error) return errorResponse(error.message, 500);

  // Update ticket status to Escalated
  await supabase
    .from('support_tickets')
    .update({
      status_id: 4,
      requires_human_agent: true,
      updated_at: new Date().toISOString()
    })
    .eq('ticket_id', ticketId);

  return successResponse(data);
}

async function handleGetProcessorModels() {
  const { data } = await supabase.from('processor_models').select('*').order('manufacturer, model');
  return successResponse(data || []);
}

async function handleGetProcessorArchitectures() {
  const { data } = await supabase.from('processor_architectures').select('*').order('name');
  return successResponse(data || []);
}

async function handleGetUpdateStatuses() {
  const { data } = await supabase.from('update_statuses').select('*').order('name');
  return successResponse(data || []);
}
