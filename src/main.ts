/**
 * @fileoverview Application entry point
 * @description Bootstraps the NestJS application with all configurations
 * @module main
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './middleware/error.filter';
import { config } from './config/config';

/**
 * Bootstrap function
 * @description Initializes and starts the NestJS application
 * @async
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix(config.app.apiPrefix);

  // Enable CORS
  app.enableCors({
    origin: config.websocket.corsOrigin,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable type conversion
      },
    })
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Start the server
  await app.listen(config.app.port);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    Chat Application Server                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Environment: ${config.app.env.padEnd(46)}║
║  Port: ${String(config.app.port).padEnd(53)}║
║  API Prefix: ${config.app.apiPrefix.padEnd(47)}║
╚═══════════════════════════════════════════════════════════════╝

Server is running at http://localhost:${config.app.port}${config.app.apiPrefix}
WebSocket available at ws://localhost:${config.app.port}

Available endpoints:
  - POST   ${config.app.apiPrefix}/auth/register
  - POST   ${config.app.apiPrefix}/auth/login
  - POST   ${config.app.apiPrefix}/auth/refresh
  - GET    ${config.app.apiPrefix}/topics/user/me
  - POST   ${config.app.apiPrefix}/topics
  - POST   ${config.app.apiPrefix}/messages
  - GET    ${config.app.apiPrefix}/groups/user/me
  - POST   ${config.app.apiPrefix}/groups
  - POST   ${config.app.apiPrefix}/media/upload
  `);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
