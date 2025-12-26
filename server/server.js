require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { initSocket } = require('./services/socketService');

// Routes
const authroutes = require('./routes/authroutes');
const deviceroutes = require('./routes/deviceroutes');
const ticketroutes = require('./routes/ticketroutes');

// Initialize App
const app = express();
const server = http.createServer(app);

const { securityHeaders, globalLimiter, authLimiter, uploadLimiter } = require('./middleware/securityMiddleware');

// Middleware
app.use(securityHeaders); // Secure Headers (Helmet)
app.use(cors()); // Allow frontend to connect (TODO: Restrict origin in PROD)
app.use(express.json({ limit: '10mb' })); // Parse JSON, limit body size

// Apply Rate Limits
app.use('/api/', globalLimiter); // General API limit
app.use('/api/auth', authLimiter); // Strict Auth limit
app.use('/api/upload', uploadLimiter); // Upload limit

// Routes
// any request to /api/auth/.. goes to authroutes
app.use('/api/auth', authroutes);

// any request to /api/devices/.. goes to deviceroutes
app.use('/api/devices', deviceroutes);

// any request to /api/tickets/.. goes to ticketroutes
// any request to /api/tickets/.. goes to ticketroutes
app.use('/api/tickets', ticketroutes);
const uploadroutes = require('./routes/uploadRoutes');
app.use('/api/upload', uploadroutes);

// Basic Health Check Route
app.get('/', (req, res) => {
    res.send('IT Support Portal API is running...');
});

// Initialize Socket.IO via Service
const io = initSocket(server);
app.set('io', io); // Make available to controllers

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Check DB connection
        const { error } = await supabase.from('devices').select('device_id').limit(1);
        if (error) throw error;

        res.json({
            status: 'online',
            database: 'connected',
            timestamp: new Date()
        });
    } catch (err) {
        console.error("Health Check Failed:", err);
        res.status(503).json({
            status: 'degraded',
            database: 'disconnected',
            error: err.message
        });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});