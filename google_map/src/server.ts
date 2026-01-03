import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { config, validateConfig } from './config';
import { findAvailablePort } from './port-utils';
import apiRoutes from './routes';
import voiceRoutes from './voice-routes';

// Validate configuration on startup
validateConfig();

const app: Express = express();

// Base path for reverse proxy
const BASE_PATH = process.env.BASE_PATH || '/google_map';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend) under base path
app.use(BASE_PATH, express.static(path.join(__dirname, '../public')));

// API routes under base path
app.use(`${BASE_PATH}/api`, apiRoutes);

// Voice WebRTC routes
app.use(`${BASE_PATH}/api/voice/webrtc`, voiceRoutes);

// Health check endpoint
app.get(`${BASE_PATH}/health`, (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
    version: '2.0.0',
    features: ['chat-agent', 'mcp-tools', 'export']
  });
});

// Root redirect to chat UI
app.get('/', (_req: Request, res: Response) => {
  res.redirect(`${BASE_PATH}/chat.html`);
});

// Base path redirect to chat UI
app.get(BASE_PATH, (_req: Request, res: Response) => {
  res.redirect(`${BASE_PATH}/chat.html`);
});

// Serve chat UI for /chat route
app.get(`${BASE_PATH}/chat`, (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/chat.html'));
});

// Legacy: Serve the old places search frontend
app.get(`${BASE_PATH}/places`, (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve the frontend for all other routes under base path
app.get(`${BASE_PATH}/*`, (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/chat.html'));
});

// Start server with dynamic port allocation
async function startServer() {
  try {
    const preferredPort = config.port;
    const port = await findAvailablePort(preferredPort);
    
    if (port !== preferredPort) {
      console.log(`⚠️  Preferred port ${preferredPort} was in use, using port ${port} instead`);
    }

    app.listen(port, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║     Google Maps Places Scraper - Server Started            ║
╠════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${port}${' '.repeat(Math.max(0, 17 - port.toString().length))}║
║  Environment: ${config.nodeEnv.padEnd(43)}║
║  API Endpoint: http://localhost:${port}/api${' '.repeat(Math.max(0, 14 - port.toString().length))}║
╚════════════════════════════════════════════════════════════╝
      `);
      
      if (!config.googleMapsApiKey) {
        console.warn('⚠️  Warning: GOOGLE_MAPS_API_KEY not configured');
      }
      if (!config.supabaseUrl || !config.supabaseServiceKey) {
        console.warn('⚠️  Warning: Supabase not configured - data will not be persisted');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
