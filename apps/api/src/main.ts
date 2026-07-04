import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // ponytail: 3001 fallback — Nuxt dev owns 3000; both on 3000 half-binds across IPv4/IPv6 and loops the dev proxy
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
