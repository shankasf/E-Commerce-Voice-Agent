// controllers/ticketController.js
const supabase = require('../config/supabaseclient');

exports.createTicket = async (req, res) => {
    const { device_id, subject, description, priority_id } = req.body;
    const { id: contact_id, org_id } = req.user; // From the Token

    try {
        // 1. Validate Ownership & Get Location
        // We check if the device exists, belongs to the user, AND get its location in one shot.
        const { data: deviceData, error: deviceError } = await supabase
            .from('devices')
            .select('location_id, organization_id')
            .eq('device_id', device_id)
            .eq('organization_id', org_id) // Security check: Must be in same org
            .single();

        if (deviceError || !deviceData) {
            return res.status(400).json({ error: 'Invalid Device ID or Device not found in your organization.' });
        }

        // 2. Fetch the ID for "Open" status
        // (We assume 'Open' is the starting status)
        const { data: statusData } = await supabase
            .from('ticket_statuses')
            .select('status_id')
            .eq('name', 'Open')
            .single();

        const openStatusId = statusData ? statusData.status_id : 1; // Fallback to 1 if lookup fails

        // 3. Insert the Ticket
        const { data: ticket, error: insertError } = await supabase
            .from('support_tickets')
            .insert([
                {
                    organization_id: org_id,
                    contact_id: contact_id,
                    device_id: device_id,
                    location_id: deviceData.location_id, // <--- Auto-tagged from Device
                    subject: subject,
                    description: description,
                    priority_id: priority_id,
                    status_id: openStatusId,
                    requires_human_agent: false // Default to false, AI handles first
                }
            ])
            .select() // Return the created row
            .single();

        if (insertError) throw insertError;

        res.status(201).json({ message: 'Ticket created successfully', ticket });

    } catch (err) {
        console.error('Ticket Creation Error:', err);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
};

// ... existing createTicket function ...

exports.getMyTickets = async (req, res) => {
    const { id: contact_id } = req.user;

    try {
        const { data, error } = await supabase
            .from('support_tickets')
            .select(`
                ticket_id,
                subject,
                description,
                created_at,
                ticket_statuses (name),
                ticket_priorities (name),
                devices (asset_name, model_id, device_models(name))
            `)
            .eq('contact_id', contact_id)
            .order('created_at', { ascending: false }); // Newest first

        if (error) throw error;

        // Clean up the data for the frontend
        const formattedTickets = data.map(ticket => ({
            id: ticket.ticket_id,
            subject: ticket.subject,
            status: ticket.ticket_statuses?.name || 'Unknown',
            priority: ticket.ticket_priorities?.name || 'Unknown',
            device: ticket.devices?.asset_name || 'No Device',
            model: ticket.devices?.device_models?.name || '',
            created_at: ticket.created_at
        }));

        res.json(formattedTickets);

    } catch (err) {
        console.error('Fetch Tickets Error:', err);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
};

exports.getTicketMessages = async (req, res) => {
    const { ticketId } = req.params;

    try {
        const { data, error } = await supabase
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('message_time', { ascending: true }); // Oldest first

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error('Fetch Messages Error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};