import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { config } from './config/index.js';
import { closePools } from './db/pool.js';
import { errorHandler, logger } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import { RealtimeServer } from './websocket/server.js';

const app = express();

// Trust proxy for k3s/docker deployments
if (config.trustProxy) {
  app.set('trust proxy', 1);
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Health check
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Error handler
app.use(errorHandler);

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize WebSocket server for realtime
const realtimeServer = new RealtimeServer(httpServer);

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');
  await realtimeServer.stop();
  await closePools();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
httpServer.listen(config.port, async () => {
  logger.info(`Backend API listening on :${config.port}`);

  // Start realtime server
  await realtimeServer.start();

  if (!config.adminPasswordHash && config.adminPassword === 'ChangeMe-Now-123!') {
    logger.warn('Default admin password is set. Update ADMIN_PASSWORD.');
  }
});

export default app;
