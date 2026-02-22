import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryMany, query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { role, action, params } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // ============================================
    // REQUESTER ACTIONS
    // ============================================
    if (role === 'requester') {
      switch (action) {
        case 'getMyTickets': {
          const { contactId } = params;
          const data = await queryMany(
            `SELECT t.*,
              json_build_object('name', ts.name) as status,
              json_build_object('name', tp.name) as priority,
              json_build_object('name', o.name) as organization
            FROM support_tickets t
            LEFT JOIN ticket_statuses ts ON t.status_id = ts.status_id
            LEFT JOIN ticket_priorities tp ON t.priority_id = tp.priority_id
            LEFT JOIN organizations o ON t.organization_id = o.organization_id
            WHERE t.contact_id = $1
            ORDER BY t.created_at DESC`,
            [contactId]
          );
          return NextResponse.json(data);
        }

        case 'getTicketDetails': {
          const { ticketId, contactId } = params;
          const data = await queryOne(
            `SELECT t.*,
              json_build_object('name', ts.name) as status,
              json_build_object('name', tp.name) as priority,
              json_build_object('name', o.name) as organization,
              json_build_object('full_name', c.full_name, 'email', c.email, 'phone', c.phone) as contact
            FROM support_tickets t
            LEFT JOIN ticket_statuses ts ON t.status_id = ts.status_id
            LEFT JOIN ticket_priorities tp ON t.priority_id = tp.priority_id
            LEFT JOIN organizations o ON t.organization_id = o.organization_id
            LEFT JOIN contacts c ON t.contact_id = c.contact_id
            WHERE t.ticket_id = $1 AND t.contact_id = $2`,
            [ticketId, contactId]
          );
          return NextResponse.json(data);
        }

        case 'getTicketMessages': {
          const { ticketId, contactId } = params;
          // Verify ownership first
          const ticket = await queryOne(
            `SELECT ticket_id FROM support_tickets WHERE ticket_id = $1 AND contact_id = $2`,
            [ticketId, contactId]
          );
          if (!ticket) {
            return NextResponse.json([]);
          }
          const data = await queryMany(
            `SELECT tm.*,
              json_build_object('full_name', sa.full_name, 'agent_type', sa.agent_type) as sender_agent,
              json_build_object('full_name', sc.full_name) as sender_contact
            FROM ticket_messages tm
            LEFT JOIN support_agents sa ON tm.sender_agent_id = sa.support_agent_id
            LEFT JOIN contacts sc ON tm.sender_contact_id = sc.contact_id
            WHERE tm.ticket_id = $1
            ORDER BY tm.message_time ASC`,
            [ticketId]
          );
          return NextResponse.json(data);
        }

        case 'createTicket': {
          const { contactId, organizationId, subject, description, priorityId } = params;
          const data = await queryOne(
            `INSERT INTO support_tickets (contact_id, organization_id, subject, description, status_id, priority_id, requires_human_agent)
            VALUES ($1, $2, $3, $4, 1, $5, false)
            RETURNING *`,
            [contactId, organizationId, subject, description, priorityId || 2]
          );
          // Fire and forget: trigger AI assignment
          if (data) {
            const baseUrl = request.nextUrl.origin;
            fetch(baseUrl + '/api/ai-resolve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'assign',
                ticketId: data.ticket_id,
              }),
            }).catch(e => console.log('AI bot auto-assignment failed:', e));
          }
          return NextResponse.json(data);
        }

        case 'addMessage': {
          const { ticketId, contactId, content } = params;
          // Verify ownership
          const ticket = await queryOne(
            `SELECT ticket_id FROM support_tickets WHERE ticket_id = $1 AND contact_id = $2`,
            [ticketId, contactId]
          );
          if (!ticket) {
            return NextResponse.json(null);
          }
          const data = await queryOne(
            `INSERT INTO ticket_messages (ticket_id, sender_contact_id, content, message_type)
            VALUES ($1, $2, $3, 'text')
            RETURNING *`,
            [ticketId, contactId, content]
          );
          // Fire and forget: trigger AI response
          const baseUrl = request.nextUrl.origin;
          fetch(baseUrl + '/api/ai-resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'respond',
              ticketId,
              userMessage: content,
            }),
          }).catch(e => console.log('AI bot response not triggered:', e));
          return NextResponse.json(data);
        }

        case 'getMyProfile': {
          const { contactId } = params;
          const data = await queryOne(
            `SELECT c.*, json_build_object('name', o.name, 'u_e_code', o.u_e_code) as organization
            FROM contacts c
            LEFT JOIN organizations o ON c.organization_id = o.organization_id
            WHERE c.contact_id = $1`,
            [contactId]
          );
          return NextResponse.json(data);
        }

        default:
          return NextResponse.json({ error: `Unknown requester action: ${action}` }, { status: 400 });
      }
    }

    // ============================================
    // ADMIN ACTIONS
    // ============================================
    if (role === 'admin') {
      switch (action) {
        case 'getAllTickets': {
          const { filters } = params || {};
          const conditions: string[] = [];
          const values: any[] = [];
          let paramIndex = 1;

          if (filters?.statusId) {
            conditions.push(`t.status_id = $${paramIndex++}`);
            values.push(filters.statusId);
          }
          if (filters?.priorityId) {
            conditions.push(`t.priority_id = $${paramIndex++}`);
            values.push(filters.priorityId);
          }
          if (filters?.organizationId) {
            conditions.push(`t.organization_id = $${paramIndex++}`);
            values.push(filters.organizationId);
          }

          const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

          const data = await queryMany(
            `SELECT t.*,
              json_build_object('name', ts.name) as status,
              json_build_object('name', tp.name) as priority,
              json_build_object('name', o.name) as organization,
              json_build_object('full_name', c.full_name, 'phone', c.phone) as contact
            FROM support_tickets t
            LEFT JOIN ticket_statuses ts ON t.status_id = ts.status_id
            LEFT JOIN ticket_priorities tp ON t.priority_id = tp.priority_id
            LEFT JOIN organizations o ON t.organization_id = o.organization_id
            LEFT JOIN contacts c ON t.contact_id = c.contact_id
            ${whereClause}
            ORDER BY t.created_at DESC`,
            values
          );
          return NextResponse.json(data);
        }

        case 'getTicketDetails': {
          const { ticketId } = params;
          const data = await queryOne(
            `SELECT t.*,
              json_build_object('name', ts.name) as status,
              json_build_object('name', tp.name) as priority,
              json_build_object('name', o.name, 'u_e_code', o.u_e_code) as organization,
              json_build_object('full_name', c.full_name, 'email', c.email, 'phone', c.phone) as contact
            FROM support_tickets t
            LEFT JOIN ticket_statuses ts ON t.status_id = ts.status_id
            LEFT JOIN ticket_priorities tp ON t.priority_id = tp.priority_id
            LEFT JOIN organizations o ON t.organization_id = o.organization_id
            LEFT JOIN contacts c ON t.contact_id = c.contact_id
            WHERE t.ticket_id = $1`,
            [ticketId]
          );
          return NextResponse.json(data);
        }

        case 'getTicketMessages': {
          const { ticketId } = params;
          const data = await queryMany(
            `SELECT tm.*,
              json_build_object('full_name', sa.full_name, 'agent_type', sa.agent_type) as sender_agent,
              json_build_object('full_name', sc.full_name) as sender_contact
            FROM ticket_messages tm
            LEFT JOIN support_agents sa ON tm.sender_agent_id = sa.support_agent_id
            LEFT JOIN contacts sc ON tm.sender_contact_id = sc.contact_id
            WHERE tm.ticket_id = $1
            ORDER BY tm.message_time ASC`,
            [ticketId]
          );
          return NextResponse.json(data);
        }

        case 'getOrganizations': {
          const data = await queryMany(`SELECT * FROM organizations ORDER BY name`);
          return NextResponse.json(data);
        }

        case 'getContacts': {
          const { organizationId } = params || {};
          const data = await queryMany(
            `SELECT c.*, json_build_object('name', o.name) as organization
            FROM contacts c
            LEFT JOIN organizations o ON c.organization_id = o.organization_id
            WHERE ($1::int IS NULL OR c.organization_id = $1)
            ORDER BY c.full_name`,
            [organizationId || null]
          );
          return NextResponse.json(data);
        }

        case 'getAgents': {
          const data = await queryMany(`SELECT * FROM support_agents ORDER BY full_name`);
          return NextResponse.json(data);
        }

        case 'createOrganization': {
          const { name, uECode } = params;
          const data = await queryOne(
            `INSERT INTO organizations (name, u_e_code) VALUES ($1, $2) RETURNING *`,
            [name, uECode]
          );
          return NextResponse.json(data);
        }

        case 'createContact': {
          const { fullName, email, phone, organizationId } = params;
          const data = await queryOne(
            `INSERT INTO contacts (full_name, email, phone, organization_id) VALUES ($1, $2, $3, $4) RETURNING *`,
            [fullName, email, phone, organizationId]
          );
          return NextResponse.json(data);
        }

        case 'createAgent': {
          const { fullName, email, agentType, specialization } = params;
          const data = await queryOne(
            `INSERT INTO support_agents (full_name, email, agent_type, specialization, is_available) VALUES ($1, $2, $3, $4, true) RETURNING *`,
            [fullName, email, agentType, specialization]
          );
          return NextResponse.json(data);
        }

        case 'updateTicketStatus': {
          const { ticketId, statusId } = params;
          const now = new Date().toISOString();
          if (statusId >= 5) {
            await query(
              `UPDATE support_tickets SET status_id = $1, updated_at = $2, closed_at = $3 WHERE ticket_id = $4`,
              [statusId, now, now, ticketId]
            );
          } else {
            await query(
              `UPDATE support_tickets SET status_id = $1, updated_at = $2 WHERE ticket_id = $3`,
              [statusId, now, ticketId]
            );
          }
          return NextResponse.json({ success: true });
        }

        case 'assignTicket': {
          const { ticketId, agentId, isPrimary } = params;
          await query(
            `INSERT INTO ticket_assignments (ticket_id, support_agent_id, is_primary) VALUES ($1, $2, $3)`,
            [ticketId, agentId, isPrimary ?? true]
          );
          // Update ticket to In Progress
          const now = new Date().toISOString();
          await query(
            `UPDATE support_tickets SET status_id = 2, updated_at = $1 WHERE ticket_id = $2`,
            [now, ticketId]
          );
          return NextResponse.json({ success: true });
        }

        case 'getDashboardStats': {
          const data = await queryOne(
            `SELECT
              (SELECT count(*) FROM support_tickets) as total_tickets,
              (SELECT count(*) FROM support_tickets WHERE status_id = 1) as open_tickets,
              (SELECT count(*) FROM support_tickets WHERE status_id = 2) as in_progress_tickets,
              (SELECT count(*) FROM support_tickets WHERE status_id = 4) as escalated_tickets,
              (SELECT count(*) FROM support_tickets WHERE priority_id = 4) as critical_tickets,
              (SELECT count(*) FROM organizations) as total_organizations,
              (SELECT count(*) FROM contacts) as total_contacts,
              (SELECT count(*) FROM support_agents WHERE agent_type = 'Human') as total_agents,
              (SELECT count(*) FROM support_agents WHERE agent_type = 'Human' AND is_available = true) as available_agents`
          );
          return NextResponse.json(data);
        }

        default:
          return NextResponse.json({ error: `Unknown admin action: ${action}` }, { status: 400 });
      }
    }

    // ============================================
    // AGENT ACTIONS
    // ============================================
    if (role === 'agent') {
      switch (action) {
        case 'getAssignedTickets': {
          const { agentId } = params;
          const data = await queryMany(
            `SELECT t.*,
              json_build_object('name', ts.name) as status,
              json_build_object('name', tp.name) as priority,
              json_build_object('name', o.name) as organization,
              json_build_object('full_name', c.full_name, 'phone', c.phone) as contact
            FROM support_tickets t
            INNER JOIN ticket_assignments ta ON t.ticket_id = ta.ticket_id
            LEFT JOIN ticket_statuses ts ON t.status_id = ts.status_id
            LEFT JOIN ticket_priorities tp ON t.priority_id = tp.priority_id
            LEFT JOIN organizations o ON t.organization_id = o.organization_id
            LEFT JOIN contacts c ON t.contact_id = c.contact_id
            WHERE ta.support_agent_id = $1
            ORDER BY t.priority_id DESC, t.created_at DESC`,
            [agentId]
          );
          return NextResponse.json(data);
        }

        case 'getEscalatedTickets': {
          const data = await queryMany(
            `SELECT t.*,
              json_build_object('name', ts.name) as status,
              json_build_object('name', tp.name) as priority,
              json_build_object('name', o.name) as organization,
              json_build_object('full_name', c.full_name, 'phone', c.phone) as contact
            FROM support_tickets t
            LEFT JOIN ticket_statuses ts ON t.status_id = ts.status_id
            LEFT JOIN ticket_priorities tp ON t.priority_id = tp.priority_id
            LEFT JOIN organizations o ON t.organization_id = o.organization_id
            LEFT JOIN contacts c ON t.contact_id = c.contact_id
            WHERE t.status_id = 4
            ORDER BY t.priority_id DESC, t.created_at DESC`
          );
          return NextResponse.json(data);
        }

        case 'getHumanRequiredTickets': {
          const data = await queryMany(
            `SELECT t.*,
              json_build_object('name', ts.name) as status,
              json_build_object('name', tp.name) as priority,
              json_build_object('name', o.name) as organization,
              json_build_object('full_name', c.full_name, 'phone', c.phone) as contact
            FROM support_tickets t
            LEFT JOIN ticket_statuses ts ON t.status_id = ts.status_id
            LEFT JOIN ticket_priorities tp ON t.priority_id = tp.priority_id
            LEFT JOIN organizations o ON t.organization_id = o.organization_id
            LEFT JOIN contacts c ON t.contact_id = c.contact_id
            WHERE t.requires_human_agent = true AND t.status_id IN (1, 2, 3, 4)
            ORDER BY t.priority_id DESC, t.created_at DESC`
          );
          return NextResponse.json(data);
        }

        case 'getTicketDetails': {
          const { ticketId, agentId } = params;
          // For demo, grant access to any agent (same as admin query)
          const data = await queryOne(
            `SELECT t.*,
              json_build_object('name', ts.name) as status,
              json_build_object('name', tp.name) as priority,
              json_build_object('name', o.name, 'u_e_code', o.u_e_code) as organization,
              json_build_object('full_name', c.full_name, 'email', c.email, 'phone', c.phone) as contact
            FROM support_tickets t
            LEFT JOIN ticket_statuses ts ON t.status_id = ts.status_id
            LEFT JOIN ticket_priorities tp ON t.priority_id = tp.priority_id
            LEFT JOIN organizations o ON t.organization_id = o.organization_id
            LEFT JOIN contacts c ON t.contact_id = c.contact_id
            WHERE t.ticket_id = $1`,
            [ticketId]
          );
          return NextResponse.json(data);
        }

        case 'getTicketMessages': {
          const { ticketId, agentId } = params;
          // Verify access (for demo, grant access to any agent)
          const ticket = await queryOne(
            `SELECT ticket_id FROM support_tickets WHERE ticket_id = $1`,
            [ticketId]
          );
          if (!ticket) {
            return NextResponse.json([]);
          }
          const data = await queryMany(
            `SELECT tm.*,
              json_build_object('full_name', sa.full_name, 'agent_type', sa.agent_type) as sender_agent,
              json_build_object('full_name', sc.full_name) as sender_contact
            FROM ticket_messages tm
            LEFT JOIN support_agents sa ON tm.sender_agent_id = sa.support_agent_id
            LEFT JOIN contacts sc ON tm.sender_contact_id = sc.contact_id
            WHERE tm.ticket_id = $1
            ORDER BY tm.message_time ASC`,
            [ticketId]
          );
          return NextResponse.json(data);
        }

        case 'addMessage': {
          const { ticketId, agentId, content } = params;
          // Verify access (for demo, grant access to any agent)
          const ticket = await queryOne(
            `SELECT ticket_id FROM support_tickets WHERE ticket_id = $1`,
            [ticketId]
          );
          if (!ticket) {
            return NextResponse.json(null);
          }
          const data = await queryOne(
            `INSERT INTO ticket_messages (ticket_id, sender_agent_id, content, message_type)
            VALUES ($1, $2, $3, 'text')
            RETURNING *`,
            [ticketId, agentId, content]
          );
          return NextResponse.json(data);
        }

        case 'updateTicketStatus': {
          const { ticketId, agentId, statusId } = params;
          // Verify access (for demo, grant access to any agent)
          const ticket = await queryOne(
            `SELECT ticket_id FROM support_tickets WHERE ticket_id = $1`,
            [ticketId]
          );
          if (!ticket) {
            return NextResponse.json({ success: false });
          }
          const now = new Date().toISOString();
          if (statusId >= 5) {
            await query(
              `UPDATE support_tickets SET status_id = $1, updated_at = $2, closed_at = $3 WHERE ticket_id = $4`,
              [statusId, now, now, ticketId]
            );
          } else {
            await query(
              `UPDATE support_tickets SET status_id = $1, updated_at = $2 WHERE ticket_id = $3`,
              [statusId, now, ticketId]
            );
          }
          return NextResponse.json({ success: true });
        }

        case 'claimTicket': {
          const { ticketId, agentId } = params;
          await query(
            `INSERT INTO ticket_assignments (ticket_id, support_agent_id, is_primary) VALUES ($1, $2, true)`,
            [ticketId, agentId]
          );
          const now = new Date().toISOString();
          await query(
            `UPDATE support_tickets SET status_id = 2, updated_at = $1 WHERE ticket_id = $2`,
            [now, ticketId]
          );
          return NextResponse.json({ success: true });
        }

        case 'getMyProfile': {
          const { agentId } = params;
          const data = await queryOne(
            `SELECT * FROM support_agents WHERE support_agent_id = $1`,
            [agentId]
          );
          return NextResponse.json(data);
        }

        case 'updateAvailability': {
          const { agentId, isAvailable } = params;
          await query(
            `UPDATE support_agents SET is_available = $1 WHERE support_agent_id = $2`,
            [isAvailable, agentId]
          );
          return NextResponse.json({ success: true });
        }

        case 'getDashboardStats': {
          const { agentId } = params;
          const data = await queryOne(
            `SELECT
              (SELECT count(*) FROM ticket_assignments ta
                INNER JOIN support_tickets t ON ta.ticket_id = t.ticket_id
                WHERE ta.support_agent_id = $1) as assigned_tickets,
              (SELECT count(*) FROM support_tickets WHERE status_id = 4) as escalated_tickets,
              (SELECT count(*) FROM support_tickets
                WHERE requires_human_agent = true AND status_id IN (1, 2, 3, 4)) as human_required_tickets,
              (SELECT count(*) FROM ticket_assignments ta
                INNER JOIN support_tickets t ON ta.ticket_id = t.ticket_id
                WHERE ta.support_agent_id = $1 AND t.priority_id = 4) as critical_tickets`,
            [agentId]
          );
          return NextResponse.json(data);
        }

        case 'getAllHumanAgents': {
          const data = await queryMany(
            `SELECT * FROM support_agents WHERE agent_type = 'Human' ORDER BY full_name`
          );
          return NextResponse.json(data);
        }

        default:
          return NextResponse.json({ error: `Unknown agent action: ${action}` }, { status: 400 });
      }
    }

    // ============================================
    // UTIL ACTIONS (no role needed)
    // ============================================
    if (role === 'util' || !role) {
      switch (action) {
        case 'getTicketStatuses': {
          const data = await queryMany(`SELECT * FROM ticket_statuses ORDER BY status_id`);
          return NextResponse.json(data);
        }

        case 'getTicketPriorities': {
          const data = await queryMany(`SELECT * FROM ticket_priorities ORDER BY priority_id`);
          return NextResponse.json(data);
        }

        case 'getLocations': {
          const { organizationId } = params || {};
          const data = await queryMany(
            `SELECT l.*, json_build_object('name', o.name) as organization
            FROM locations l
            LEFT JOIN organizations o ON l.organization_id = o.organization_id
            WHERE ($1::int IS NULL OR l.organization_id = $1)
            ORDER BY l.name`,
            [organizationId || null]
          );
          return NextResponse.json(data);
        }

        case 'createLocation': {
          const { organizationId, name, locationType, requiresHumanAgent } = params;
          const data = await queryOne(
            `INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [organizationId, name, locationType || 'Other', requiresHumanAgent || false]
          );
          return NextResponse.json(data);
        }

        case 'getDevices': {
          const { organizationId, locationId } = params || {};
          const conditions: string[] = [];
          const values: any[] = [];
          let paramIndex = 1;

          if (organizationId) {
            conditions.push(`d.organization_id = $${paramIndex++}`);
            values.push(organizationId);
          }
          if (locationId) {
            conditions.push(`d.location_id = $${paramIndex++}`);
            values.push(locationId);
          }

          const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

          const data = await queryMany(
            `SELECT d.*,
              json_build_object('name', o.name) as organization,
              json_build_object('name', loc.name) as location,
              json_build_object('name', dm.name) as manufacturer,
              json_build_object('name', dmod.name) as model,
              json_build_object('name', os.name) as os,
              json_build_object('name', dt.name) as device_type
            FROM devices d
            LEFT JOIN organizations o ON d.organization_id = o.organization_id
            LEFT JOIN locations loc ON d.location_id = loc.location_id
            LEFT JOIN device_manufacturers dm ON d.manufacturer_id = dm.manufacturer_id
            LEFT JOIN device_models dmod ON d.model_id = dmod.model_id
            LEFT JOIN operating_systems os ON d.os_id = os.os_id
            LEFT JOIN device_types dt ON d.device_type_id = dt.device_type_id
            ${whereClause}
            ORDER BY d.asset_name`,
            values
          );
          return NextResponse.json(data);
        }

        case 'getDeviceById': {
          const { deviceId } = params;
          const data = await queryOne(
            `SELECT d.*,
              json_build_object('name', o.name) as organization,
              json_build_object('name', loc.name) as location,
              json_build_object('name', dm.name) as manufacturer,
              json_build_object('name', dmod.name) as model,
              json_build_object('name', os.name) as os,
              json_build_object('name', dt.name) as device_type
            FROM devices d
            LEFT JOIN organizations o ON d.organization_id = o.organization_id
            LEFT JOIN locations loc ON d.location_id = loc.location_id
            LEFT JOIN device_manufacturers dm ON d.manufacturer_id = dm.manufacturer_id
            LEFT JOIN device_models dmod ON d.model_id = dmod.model_id
            LEFT JOIN operating_systems os ON d.os_id = os.os_id
            LEFT JOIN device_types dt ON d.device_type_id = dt.device_type_id
            WHERE d.device_id = $1`,
            [deviceId]
          );
          return NextResponse.json(data);
        }

        case 'getDeviceManufacturers': {
          const data = await queryMany(`SELECT * FROM device_manufacturers ORDER BY name`);
          return NextResponse.json(data);
        }

        case 'getDeviceModels': {
          const { manufacturerId } = params || {};
          const data = await queryMany(
            `SELECT dm.*, json_build_object('name', m.name) as manufacturer
            FROM device_models dm
            LEFT JOIN device_manufacturers m ON dm.manufacturer_id = m.manufacturer_id
            WHERE ($1::int IS NULL OR dm.manufacturer_id = $1)
            ORDER BY dm.name`,
            [manufacturerId || null]
          );
          return NextResponse.json(data);
        }

        case 'getOperatingSystems': {
          const data = await queryMany(`SELECT * FROM operating_systems ORDER BY name`);
          return NextResponse.json(data);
        }

        case 'getDeviceTypes': {
          const data = await queryMany(`SELECT * FROM device_types ORDER BY name`);
          return NextResponse.json(data);
        }

        case 'getDomains': {
          const data = await queryMany(`SELECT * FROM domains ORDER BY name`);
          return NextResponse.json(data);
        }

        case 'getAccountManagers': {
          const data = await queryMany(`SELECT * FROM account_managers ORDER BY full_name`);
          return NextResponse.json(data);
        }

        case 'createAccountManager': {
          const { fullName, email, phone } = params;
          const data = await queryOne(
            `INSERT INTO account_managers (full_name, email, phone) VALUES ($1, $2, $3) RETURNING *`,
            [fullName, email, phone || null]
          );
          return NextResponse.json(data);
        }

        case 'getContactDevices': {
          const { contactId } = params;
          const data = await queryMany(
            `SELECT cd.*,
              json_build_object('device_id', d.device_id, 'asset_name', d.asset_name, 'status', d.status, 'host_name', d.host_name) as device
            FROM contact_devices cd
            LEFT JOIN devices d ON cd.device_id = d.device_id
            WHERE cd.contact_id = $1 AND cd.unassigned_at IS NULL`,
            [contactId]
          );
          return NextResponse.json(data);
        }

        case 'assignDeviceToContact': {
          const { contactId, deviceId } = params;
          const data = await queryOne(
            `INSERT INTO contact_devices (contact_id, device_id) VALUES ($1, $2) RETURNING *`,
            [contactId, deviceId]
          );
          return NextResponse.json(data);
        }

        case 'unassignDeviceFromContact': {
          const { contactId, deviceId } = params;
          await query(
            `UPDATE contact_devices SET unassigned_at = $1
            WHERE contact_id = $2 AND device_id = $3 AND unassigned_at IS NULL`,
            [new Date().toISOString(), contactId, deviceId]
          );
          return NextResponse.json({ success: true });
        }

        case 'getTicketEscalations': {
          const { ticketId } = params;
          const data = await queryMany(
            `SELECT te.*,
              json_build_object('full_name', fa.full_name, 'agent_type', fa.agent_type) as from_agent,
              json_build_object('full_name', ta.full_name, 'agent_type', ta.agent_type) as to_agent
            FROM ticket_escalations te
            LEFT JOIN support_agents fa ON te.from_agent_id = fa.support_agent_id
            LEFT JOIN support_agents ta ON te.to_agent_id = ta.support_agent_id
            WHERE te.ticket_id = $1
            ORDER BY te.escalation_time DESC`,
            [ticketId]
          );
          return NextResponse.json(data);
        }

        case 'createEscalation': {
          const { ticketId, fromAgentId, toAgentId, reason } = params;
          const data = await queryOne(
            `INSERT INTO ticket_escalations (ticket_id, from_agent_id, to_agent_id, reason)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [ticketId, fromAgentId, toAgentId, reason]
          );
          // Update ticket status to Escalated
          const now = new Date().toISOString();
          await query(
            `UPDATE support_tickets SET status_id = 4, requires_human_agent = true, updated_at = $1 WHERE ticket_id = $2`,
            [now, ticketId]
          );
          return NextResponse.json(data);
        }

        case 'getProcessorModels': {
          const data = await queryMany(`SELECT * FROM processor_models ORDER BY manufacturer, model`);
          return NextResponse.json(data);
        }

        case 'getProcessorArchitectures': {
          const data = await queryMany(`SELECT * FROM processor_architectures ORDER BY name`);
          return NextResponse.json(data);
        }

        case 'getUpdateStatuses': {
          const data = await queryMany(`SELECT * FROM update_statuses ORDER BY name`);
          return NextResponse.json(data);
        }

        default:
          return NextResponse.json({ error: `Unknown util action: ${action}` }, { status: 400 });
      }
    }

    return NextResponse.json({ error: `Unknown role: ${role}` }, { status: 400 });

  } catch (error) {
    console.error('Database proxy error:', error);
    return NextResponse.json(
      {
        error: 'Database operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
