/**
 * Custom Next.js server with dynamic port allocation
 * Falls back to a random available port if the preferred port is in use
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const net = require('net');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';

// Logging configuration
const LOG_DIR = process.env.LOG_DIR || './logs';
const LOG_TO_FILE = process.env.LOG_TO_FILE !== 'false';

// Ensure logs directory exists
if (LOG_TO_FILE && !fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
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

/**
 * Check if a port is available
 */
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

/**
 * Find an available port starting from the preferred port
 */
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

async function main() {
    try {
        // Find an available port
        const port = await findAvailablePort(preferredPort);

        if (port !== preferredPort) {
            console.log(`⚠️  Preferred port ${preferredPort} was in use, using port ${port} instead`);
        }

        const app = next({ dev, hostname, port });
        const handle = app.getRequestHandler();

        await app.prepare();

        const server = createServer(async (req, res) => {
            const startTime = Date.now();

            // Log when response finishes
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                // Skip logging for static assets to reduce noise
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

        server.listen(port, '0.0.0.0', (err) => {
            if (err) throw err;
            console.log(`
╔════════════════════════════════════════════════════════════╗
║     TMS Console - Server Started                           ║
╠════════════════════════════════════════════════════════════╣
║  Server running at: http://${hostname}:${port}${' '.repeat(Math.max(0, 23 - port.toString().length - hostname.length))}║
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
