// routes/ticketRoutes.js
const express = require('express');
const router = express.Router();
const ticketcontroller = require('../controllers/ticketcontroller');
const authmiddleware = require('../middleware/authmiddleware');
const agentcontroller = require('../controllers/agentcontrollers');


const { validate, createTicketSchema, updateTicketSchema, postMessageSchema } = require('../middleware/validationMiddleware');


// POST /api/tickets
// Protected by Auth Middleware (and validated)
router.post('/', authmiddleware, validate(createTicketSchema), ticketcontroller.createTicket);

// GET /api/tickets/my-tickets
// Protected by Auth Middleware
router.get('/', authmiddleware, ticketcontroller.getMyTickets);

router.post('/:ticketId/messages', authmiddleware, validate(postMessageSchema), agentcontroller.postMessage);
// GET /api/tickets/:ticketId/messages
// Protected by Auth Middleware
router.get('/:ticketId/messages', authmiddleware, ticketcontroller.getTicketMessages);

// PUT /api/tickets/:ticketId
// Updates ticket status or details
router.put('/:ticketId', authmiddleware, validate(updateTicketSchema), ticketcontroller.updateTicket);

module.exports = router;