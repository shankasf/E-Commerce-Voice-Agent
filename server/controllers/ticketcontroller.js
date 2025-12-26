// controllers/ticketController.js
const ticketService = require('../services/ticketService');

exports.createTicket = async (req, res) => {
    try {
        const ticket = await ticketService.createTicket(req.body, req.user);
        res.status(201).json({ message: 'Ticket created successfully', ticket });
    } catch (err) {
        console.error('Ticket Creation Error:', err.message);
        if (err.message.includes('Invalid Device')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to create ticket' });
    }
};

exports.getMyTickets = async (req, res) => {
    try {
        const tickets = await ticketService.getTicketsByContact(req.user.id);
        res.json(tickets);
    } catch (err) {
        console.error('Fetch Tickets Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
};

exports.getTicketMessages = async (req, res) => {
    try {
        const messages = await ticketService.getTicketMessages(req.params.ticketId);
        res.json(messages);
    } catch (err) {
        console.error('Fetch Messages Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

exports.updateTicket = async (req, res) => {
    try {
        const ticket = await ticketService.updateTicketStatus(req.params.ticketId, req.body.status);
        res.json({ message: 'Ticket updated', ticket });
    } catch (err) {
        console.error('Update Ticket Error:', err.message);
        if (err.message.includes('Invalid status')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to update ticket' });
    }
};