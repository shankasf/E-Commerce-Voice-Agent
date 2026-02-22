import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { createServer, Server } from 'net';
import { AppModule } from './app.module';

/**
 * Check if a port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server: Server = createServer();
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
async function findAvailablePort(startPort: number, maxAttempts = 100): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`Port ${port} is in use, trying next...`);
  }
  throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Simple request logging middleware
  app.use((req: any, res: any, next: any) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://salon.callsphere.tech',
      process.env.FRONTEND_URL || 'http://localhost:5173',
    ],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('GlamBook API')
    .setDescription('GlamBook Salon Booking API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const preferredPort = parseInt(process.env.BACKEND_PORT || process.env.PORT || '3001', 10);
  const port = await findAvailablePort(preferredPort);
  
  if (port !== preferredPort) {
    console.log(`⚠️  Preferred port ${preferredPort} was in use, using port ${port} instead`);
  }
  
  await app.listen(port);
  console.log(`GlamBook Backend running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api`);
}
bootstrap();
