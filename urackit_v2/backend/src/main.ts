import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for frontend (React) and Python AI service
  app.enableCors({
    origin: [
      'http://localhost:5173', // Vite React dev
      'http://localhost:3003', // Backend port
      'http://localhost:8081', // Python AI service
      'https://webhook.callsphere.tech', // Production
    ],
    credentials: true,
  });

  // Serve static frontend files from dist folder
  const frontendPath = join(__dirname, '..', '..', '..', 'frontend', 'dist');
  console.log('Static assets path:', frontendPath);
  app.useStaticAssets(frontendPath, { prefix: '/v2/dashboard' });

  // SPA fallback: serve index.html for all /v2/dashboard/* routes (client-side routing)
  const expressApp = app.getHttpAdapter().getInstance();
  const indexPath = join(frontendPath, 'index.html');
  
  expressApp.use('/v2/dashboard', (req: any, res: any, next: any) => {
    // Skip static assets - let them 404 naturally
    if (req.url.includes('/assets/') || 
        req.url.match(/\.(js|css|svg|png|ico|json|woff|woff2|ttf)$/)) {
      return next();
    }
    // Skip the root dashboard path (let static assets handle it)
    if (req.url === '/' || req.url === '') {
      return next();
    }
    // Serve index.html for SPA routes
    if (existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });

  // Global validation pipe
  app.setGlobalPrefix('v2/api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('URackIT Voice Agent API')
    .setDescription('Backend API for URackIT IT Support Voice Agent System')
    .setVersion('2.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('dashboard', 'Dashboard analytics and metrics')
    .addTag('calls', 'Call logs and voice agent interactions')
    .addTag('tickets', 'Support ticket management')
    .addTag('devices', 'Device inventory')
    .addTag('organizations', 'Organization management')
    .addTag('contacts', 'Contact management')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v2/api/docs', app, document);

  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  
  console.log(`🚀 URackIT API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/v2/api/docs`);
  console.log(`🎨 Dashboard: http://localhost:${port}/v2/dashboard/`);
}
bootstrap();
