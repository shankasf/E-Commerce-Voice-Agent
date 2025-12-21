require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Routes
const authroutes = require('./routes/authroutes');
const deviceroutes = require('./routes/deviceroutes');
const ticketroutes = require('./routes/ticketroutes');
// Initialize App
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Parse incoming JSON data (like login info)

// any request to /api/auth/.. goes to authroutes
app.use('/api/auth', authroutes);

// any request to /api/devices/.. goes to deviceroutes
app.use('/api/devices', deviceroutes);

// any request to /api/tickets/.. goes to ticketroutes
app.use('/api/tickets', ticketroutes);

// Real-time Chat Setup (Socket.io)
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all connections for dev (restrict this in prod)
        methods: ["GET", "POST"]
    }
});

// Basic Health Check Route
app.get('/', (req, res) => {
    res.send('IT Support Portal API is running...');
});

// Socket Connection Logic (Placeholder)
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log('User Disconnected');
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});