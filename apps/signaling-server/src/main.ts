/**
 * Main entry point for the Remote Control Platform Signaling Server
 * WebRTC signaling server with Socket.IO for host discovery and peer coordination
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for cross-origin requests
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  });
  
  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  console.log('🚀 Remote Control Platform Signaling Server');
  console.log(`📡 WebSocket server running on: http://localhost:${port}`);
  console.log(`🔌 Socket.IO endpoint: ws://localhost:${port}/signal`);
  console.log('⏳ Waiting for host and client connections...');
}

bootstrap();
