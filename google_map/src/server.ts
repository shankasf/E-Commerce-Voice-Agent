import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { config, validateConfig } from './config';
import apiRoutes from './routes';

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

// Start server
app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     Google Maps Places Scraper - Server Started            ║
╠════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${config.port}                 ║
║  Environment: ${config.nodeEnv.padEnd(43)}║
║  API Endpoint: http://localhost:${config.port}/api                  ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  if (!config.googleMapsApiKey) {
    console.warn('⚠️  Warning: GOOGLE_MAPS_API_KEY not configured');
  }
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    console.warn('⚠️  Warning: Supabase not configured - data will not be persisted');
  }
});

export default app;
