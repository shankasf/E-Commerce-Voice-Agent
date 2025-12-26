const supabase = require('../config/supabaseclient');

/**
 * Service for handling Ticket-related business logic.
 * Decouples DB operations from HTTP controllers.
 */
class TicketService {

    /**
     * Create a new support ticket.
     * Validates device ownership and sets initial status.
     */
    async createTicket(ticketData, user) {
        const { device_id, subject, description, priority_id } = ticketData;
        const { id: contact_id, org_id } = user;

        // 1. Validate Ownership & Get Location
        const { data: deviceData, error: deviceError } = await supabase
            .from('devices')
            .select('location_id, organization_id')
            .eq('device_id', device_id)
            .eq('organization_id', org_id)
            .single();

        if (deviceError || !deviceData) {
            throw new Error('Invalid Device ID or Device not found in your organization.');
        }

        // 2. Fetch "Open" Status ID
        const { data: statusData } = await supabase
            .from('ticket_statuses')
            .select('status_id')
            .eq('name', 'Open')
            .single();

        const openStatusId = statusData ? statusData.status_id : 1;

        // 3. Insert Ticket
        const { data: ticket, error: insertError } = await supabase
            .from('support_tickets')
            .insert([{
                organization_id: org_id,
                contact_id: contact_id,
                device_id: device_id,
                location_id: deviceData.location_id,
                subject: subject,
                description: description,
                priority_id: priority_id,
                status_id: openStatusId,
                requires_human_agent: false
            }])
            .select()
            .single();

        if (insertError) throw insertError;
        return ticket;
    }

    /**
     * Get all tickets for a specific contact (user).
     */
    async getTicketsByContact(contactId) {
        const { data, error } = await supabase
            .from('support_tickets')
            .select(`
                ticket_id,
                subject,
                description,
                created_at,
                requires_human_agent,
                ticket_statuses (name),
                ticket_priorities (name),
                devices (asset_name, model_id, device_models(name))
            `)
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transformation Logic (could be in a DTO, but service is fine for now)
        return data.map(ticket => ({
            id: ticket.ticket_id,
            subject: ticket.subject,
            status: ticket.ticket_statuses?.name || 'Unknown',
            priority: ticket.ticket_priorities?.name || 'Unknown',
            requires_human_agent: ticket.requires_human_agent,
            device: ticket.devices?.asset_name || 'No Device',
            model: ticket.devices?.device_models?.name || '',
            created_at: ticket.created_at
        }));
    }

    /**
     * Get messages for a specific ticket.
     */
    async getTicketMessages(ticketId) {
        const { data, error } = await supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('message_time', { ascending: true });

        if (error) throw error;
        return data;
    }

    /**
     * Update a ticket's status.
     */
    async updateTicketStatus(ticketId, statusName) {
        let updatePayload = {};

        if (statusName) {
            const { data: statusData, error: statusError } = await supabase
                .from('ticket_statuses')
                .select('status_id')
                .eq('name', statusName)
                .single();

            if (statusError || !statusData) {
                throw new Error(`Invalid status: ${statusName}`);
            }
            updatePayload.status_id = statusData.status_id;
        }

        const { data, error } = await supabase
            .from('support_tickets')
            .update(updatePayload)
            .eq('ticket_id', ticketId)
            .select();

        if (error) throw error;
        return data[0];
    }
}

module.exports = new TicketService();
