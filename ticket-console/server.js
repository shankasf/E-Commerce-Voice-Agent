/**
 * Custom Next.js server with WebSocket support for Remote Endpoint Agents
 * Falls back to a random available port if the preferred port is in use
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');

const dev = process.env.NODE_ENV !== 'production';

// Logging configuration
const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_TO_FILE = process.env.LOG_TO_FILE !== 'false';

// Ensure logs directory exists
if (LOG_TO_FILE && !fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Get log file stream
function getLogStream() {
    if (!LOG_TO_FILE) return null;
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOG_DIR, `access-${date}.log`);
    return fs.createWriteStream(logFile, { flags: 'a' });
}

// Format log entry
function formatLog(req, res, duration) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const status = res.statusCode;
    const userAgent = req.headers['user-agent'] || '-';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '-';

    return `[${timestamp}] ${method} ${url} ${status} ${duration}ms - ${ip} - ${userAgent}`;
}

// Log to console and file
function log(message) {
    console.log(message);
    if (LOG_TO_FILE) {
        const stream = getLogStream();
        if (stream) {
            stream.write(message + '\n');
            stream.end();
        }
    }
}

const hostname = process.env.HOST || 'localhost';
const preferredPort = parseInt(process.env.PORT || '3001', 10);

// ─────────────────────────────────────────────────────────────
// Remote Agent Store (In-Memory with JSON persistence)
// ─────────────────────────────────────────────────────────────

const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');

// In-memory storage
const devices = new Map();
const deviceConnections = new Map(); // device_id -> WebSocket

// Load devices from file
function loadDevices() {
    try {
        if (fs.existsSync(DEVICES_FILE)) {
            const data = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf-8'));
            data.forEach(d => {
                d.connected = false; // Reset on startup
                devices.set(d.device_id, d);
            });
            console.log(`[RemoteAgent] Loaded ${devices.size} devices`);
        }
    } catch (error) {
        console.error('[RemoteAgent] Error loading devices:', error);
    }
}

// Save devices to file
function saveDevices() {
    try {
        fs.writeFileSync(DEVICES_FILE, JSON.stringify(Array.from(devices.values()), null, 2));
    } catch (error) {
        console.error('[RemoteAgent] Error saving devices:', error);
    }
}

// Generate enrollment code
function generateEnrollmentCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
    code += '-';
    for (let i = 0; i < 4; i++) code += numbers[Math.floor(Math.random() * numbers.length)];
    return code;
}

// Generate simple token
function generateToken(deviceId) {
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    return Buffer.from(`${deviceId}:${expiry}`).toString('base64');
}

// Validate token
function validateToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [deviceId, expiry] = decoded.split(':');
        if (new Date(expiry) < new Date()) return { valid: false };
        return { valid: true, deviceId };
    } catch {
        return { valid: false };
    }
}

// Load devices on startup
loadDevices();

// Expose store to global for API routes to access
global.remoteAgentStore = {
    devices: devices,
    deviceConnections: deviceConnections,
    generateEnrollmentCode: generateEnrollmentCode,
    saveDevices: saveDevices,
    sendToDevice: (deviceId, message) => {
        const ws = deviceConnections.get(deviceId);
        if (ws && ws.readyState === 1) { // WebSocket.OPEN
            ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    },
    isDeviceOnline: (deviceId) => {
        const ws = deviceConnections.get(deviceId);
        return ws && ws.readyState === 1; // WebSocket.OPEN
    },
    pendingRequests: new Map(),
};

console.log('[RemoteAgent] Store exposed to global.remoteAgentStore');

// ─────────────────────────────────────────────────────────────
// WebSocket Relay for Remote Agents
// ─────────────────────────────────────────────────────────────

function setupWebSocketRelay(server) {
    // Create WebSocket server without attaching to server (we'll handle upgrades manually)
    const wss = new WebSocketServer({ 
        noServer: true,  // Don't attach to server - we'll handle upgrades manually
        verifyClient: (info) => {
            const url = info.req.url;
            const isMatch = url === '/tms/api/remote-agent/ws' || url === '/api/remote-agent/ws';
            console.log(`[WebSocket] Verify client for path: ${url} - ${isMatch ? 'ACCEPTED' : 'REJECTED'}`);
            return isMatch;
        }
    });

    console.log('[WebSocket] Relay server initialized');
    console.log('[WebSocket] Accepting connections at: /tms/api/remote-agent/ws');
    console.log('[WebSocket] Also accepting connections at: /api/remote-agent/ws');

    wss.on('connection', (ws, req) => {
        let deviceId = null;
        let authenticated = false;

        console.log('[WebSocket] ✅ New connection established!');
        console.log('[WebSocket] From:', req.socket.remoteAddress);
        console.log('[WebSocket] URL:', req.url);

        // Set up ping/pong for connection health
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                switch (message.type) {
                    case 'enroll': {
                        // Handle device enrollment
                        const { enrollment_code, device_name, fingerprint, executor_info } = message;
                        
                        // Find device by enrollment code
                        let device = null;
                        for (const d of devices.values()) {
                            if (d.enrollment_code === enrollment_code && d.status === 'pending') {
                                device = d;
                                break;
                            }
                        }

                        if (!device) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'Invalid or expired enrollment code'
                            }));
                            return;
                        }

                        // Update device info
                        device.device_name = device_name || device.device_name;
                        device.fingerprint = fingerprint;
                        device.executor_info = executor_info;
                        device.status = 'active';
                        device.connected = true;
                        device.last_seen = new Date().toISOString();
                        device.device_token = generateToken(device.device_id);
                        
                        saveDevices();

                        // Register connection
                        deviceId = device.device_id;
                        authenticated = true;
                        deviceConnections.set(deviceId, ws);

                        ws.send(JSON.stringify({
                            type: 'enrolled',
                            device_id: device.device_id,
                            device_name: device.device_name,
                            device_token: device.device_token,
                        }));

                        console.log(`[WebSocket] Device enrolled: ${device.device_name} (${device.device_id})`);
                        break;
                    }

                    case 'authenticate': {
                        // Handle returning device authentication
                        const { device_id, device_token, fingerprint } = message;
                        
                        const device = devices.get(device_id);
                        if (!device) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'Device not found'
                            }));
                            return;
                        }

                        if (device.status === 'disabled') {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'Device has been disabled'
                            }));
                            return;
                        }

                        // Validate token
                        const tokenCheck = validateToken(device_token);
                        if (!tokenCheck.valid || tokenCheck.deviceId !== device_id) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                error: 'Invalid or expired token'
                            }));
                            return;
                        }

                        // Update device status
                        device.connected = true;
                        device.last_seen = new Date().toISOString();
                        device.fingerprint = fingerprint;
                        saveDevices();

                        // Register connection
                        deviceId = device_id;
                        authenticated = true;
                        deviceConnections.set(deviceId, ws);

                        ws.send(JSON.stringify({
                            type: 'authenticated',
                            device_id: device.device_id,
                            device_name: device.device_name,
                        }));

                        console.log(`[WebSocket] Device authenticated: ${device.device_name} (${device.device_id})`);
                        break;
                    }

                    case 'execute_result': {
                        // Handle diagnostic execution result from agent
                        if (!authenticated) {
                            ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' }));
                            return;
                        }

                        // Store the result for the pending request
                        const { request_id, ...result } = message;
                        
                        // Emit an event or store for the execute API to pick up
                        if (pendingRequests.has(request_id)) {
                            const { resolve, reject } = pendingRequests.get(request_id);
                            pendingRequests.delete(request_id);
                            // Resolve with the full result object
                            resolve(result);
                        } else {
                            console.warn(`[WebSocket] Execute result received for unknown request: ${request_id}`);
                        }
                        
                        console.log(`[WebSocket] Execute result received for request: ${request_id}`, result.success ? 'SUCCESS' : 'FAILED');
                        break;
                    }

                    case 'pong': {
                        // Client responding to our ping
                        ws.isAlive = true;
                        break;
                    }

                    case 'diagnostics_list':
                    case 'health_response': {
                        // Forward these responses to pending requests
                        if (!authenticated) return;
                        const { request_id, ...result } = message;
                        if (pendingRequests.has(request_id)) {
                            const { resolve } = pendingRequests.get(request_id);
                            pendingRequests.delete(request_id);
                            resolve(result);
                        }
                        break;
                    }

                    default:
                        console.log(`[WebSocket] Unknown message type: ${message.type}`);
                }
            } catch (error) {
                console.error('[WebSocket] Error processing message:', error);
            }
        });

        ws.on('close', () => {
            if (deviceId) {
                deviceConnections.delete(deviceId);
                const device = devices.get(deviceId);
                if (device) {
                    device.connected = false;
                    device.last_seen = new Date().toISOString();
                    saveDevices();
                }
                console.log(`[WebSocket] Device disconnected: ${deviceId}`);
            }
        });

        ws.on('error', (error) => {
            console.error('[WebSocket] Connection error:', error.message);
        });
    });

    // Heartbeat to detect dead connections
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                return ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
    });

    return wss;
}

// Pending requests for execute results
const pendingRequests = new Map();

// Update global store with pendingRequests
if (global.remoteAgentStore) {
    global.remoteAgentStore.pendingRequests = pendingRequests;
}

// Send message to a connected device
function sendToDevice(deviceId, message) {
    const ws = deviceConnections.get(deviceId);
    if (ws && ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify(message));
        return true;
    }
    return false;
}

// Check if device is online
function isDeviceOnline(deviceId) {
    const ws = deviceConnections.get(deviceId);
    return ws && ws.readyState === 1;
}

// Export functions for API routes to use
global.remoteAgentStore = {
    devices,
    deviceConnections,
    pendingRequests,
    saveDevices,
    generateEnrollmentCode,
    generateToken,
    validateToken,
    sendToDevice,
    isDeviceOnline,
};

// ─────────────────────────────────────────────────────────────
// Port Availability Check
// ─────────────────────────────────────────────────────────────

function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port, '0.0.0.0');
    });
}

async function findAvailablePort(startPort, maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
        const port = startPort + i;
        if (await isPortAvailable(port)) {
            return port;
        }
        console.log(`Port ${port} is in use, trying next...`);
    }
    throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
}

// ─────────────────────────────────────────────────────────────
// Main Server
// ─────────────────────────────────────────────────────────────

async function main() {
    try {
        const port = await findAvailablePort(preferredPort);

        if (port !== preferredPort) {
            console.log(`⚠️  Preferred port ${preferredPort} was in use, using port ${port} instead`);
        }

        const app = next({ dev, hostname, port });
        const handle = app.getRequestHandler();

        await app.prepare();

        const server = createServer(async (req, res) => {
            const startTime = Date.now();

            res.on('finish', () => {
                const duration = Date.now() - startTime;
                if (!req.url.includes('/_next/static/') && !req.url.includes('/favicon.ico')) {
                    log(formatLog(req, res, duration));
                }
            });

            try {
                const parsedUrl = parse(req.url, true);
                await handle(req, res, parsedUrl);
            } catch (err) {
                console.error('Error handling request:', err);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        });

        // Set up WebSocket relay for remote agents BEFORE setting up upgrade handler
        const wss = setupWebSocketRelay(server);
        
        // Handle WebSocket upgrade requests explicitly
        server.on('upgrade', (request, socket, head) => {
            const pathname = request.url;
            console.log(`[Server] Upgrade event received for: ${pathname}`);
            console.log(`[Server] Upgrade headers:`, JSON.stringify(request.headers, null, 2));
            
            // Check if this is our WebSocket endpoint
            if (pathname === '/tms/api/remote-agent/ws' || pathname === '/api/remote-agent/ws') {
                console.log(`[Server] ✅ Handling WebSocket upgrade for: ${pathname}`);
                // Let the WebSocketServer handle the upgrade
                wss.handleUpgrade(request, socket, head, (ws) => {
                    console.log(`[Server] ✅ WebSocket upgrade completed, emitting connection event`);
                    wss.emit('connection', ws, request);
                });
            } else {
                // Not our endpoint, destroy the socket
                console.log(`[Server] ❌ Rejecting upgrade for: ${pathname} (not our endpoint)`);
                socket.destroy();
            }
        });
        
        console.log('[Server] WebSocket upgrade handler registered');

        server.listen(port, '0.0.0.0', (err) => {
            if (err) throw err;
            console.log(`
╔════════════════════════════════════════════════════════════╗
║     TMS Console - Server Started                           ║
╠════════════════════════════════════════════════════════════╣
║  Server running at: http://${hostname}:${port}${' '.repeat(Math.max(0, 23 - port.toString().length - hostname.length))}║
║  WebSocket Relay:   ws://${hostname}:${port}/tms/api/remote-agent/ws${' '.repeat(Math.max(0, 2 - port.toString().length - hostname.length))}║
║  Environment: ${(dev ? 'development' : 'production').padEnd(43)}║
╚════════════════════════════════════════════════════════════╝
      `);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully...');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

main();
