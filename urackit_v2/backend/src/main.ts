import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
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
