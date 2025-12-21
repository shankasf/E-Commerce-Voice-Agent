// routes/ticketRoutes.js
const express = require('express');
const router = express.Router();
const ticketcontroller = require('../controllers/ticketcontroller');
const authmiddleware = require('../middleware/authmiddleware');
const agentcontroller = require('../controllers/agentcontrollers');


// POST /api/tickets
// Protected by Auth Middleware
router.post('/', authmiddleware, ticketcontroller.createTicket);

// GET /api/tickets/my-tickets
// Protected by Auth Middleware
router.get('/', authmiddleware, ticketcontroller.getMyTickets);

router.post('/:ticketId/messages', authmiddleware, agentcontroller.postMessage);
// GET /api/tickets/:ticketId/messages
// Protected by Auth Middleware
router.get('/:ticketId/messages', authmiddleware, ticketcontroller.getTicketMessages);

module.exports = router;