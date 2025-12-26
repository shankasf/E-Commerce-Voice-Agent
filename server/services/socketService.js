const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

let io;
const agentSockets = new Map(); // userId -> socketId (Desktop Agents)

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // TODO: Restrict in production
            methods: ["GET", "POST"]
        }
    });

    // MIDDLEWARE: Authenticate Socket Connections
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id; // Correctly attach user ID from token
            next();
        } catch (err) {
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.userId} (Socket: ${socket.id})`);

        // 1. Web Portal joins their own room (Auto-join based on Token)
        socket.join(socket.userId);
        console.log(`Socket ${socket.id} joined room: ${socket.userId}`);

        // 2. Desktop Agent registers (Explicit check)
        socket.on('register_agent', () => {
            // We use the ID from the token, ignoring any payload
            const userId = socket.userId;
            agentSockets.set(userId, socket.id);
            socket.join(`agent_${userId}`);
            console.log(`Desktop Agent Registered for User: ${userId}`);
        });

        // 3. Handle Command Result from Desktop Agent
        socket.on('command:result', (data) => {
            const { userId, runId, output, error } = data;
            console.log(`Command Result for ${userId} (RunID: ${runId})`);

            // Notify the specific Web Portal user (or the AI waiting)
            // Emitting to the general user room
            io.to(userId).emit('agent:command_result', { runId, output, error });

            // Also emit an internal event that our Promise logic can listen to? 
            // Better: The Controller uses the 'io' instance directly to emit, 
            // but for receiving, it might need an EventEmitter or similar if it's strictly request-response.
            // For now, we'll rely on the Controller listening to this socket event if we implement it that way, 
            // or we use a global event emitter. 
            // SIMPLIFICATION: The Controller will listen to a specific event on this 'io' instance via a helper if needed,
            // or we just trust the 'io.to(userId)' is enough for the frontend.
            // But the PROMPT constraints say "Remote Terminal Execution... using strictly Secure 'Human-in-the-Loop'... The AI Agent... should be able to execute...".
            // The AI Controller needs the result to return to the LLM.

            // We'll emit a specific server-side event that the controller can subscribe to if we use a shared Emitter,
            // OR we rely on the client (Web UI) to feed it back. 
            // The prompt implies the Backend waits.
            // So we'll emit to the process.
            process.emit(`cmd_result_${runId}`, { output, error });
        });

        socket.on('disconnect', () => {
            console.log(`User/Agent Disconnected: ${socket.id}`);
            // Cleanup map
            for (const [uid, sid] of agentSockets.entries()) {
                if (sid === socket.id) {
                    agentSockets.delete(uid);
                    break;
                }
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

// Helper checks if agent is online
const isAgentOnline = (userId) => {
    return agentSockets.has(userId);
};

module.exports = {
    initSocket,
    getIO,
    isAgentOnline
};
