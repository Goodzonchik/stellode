import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { setupSwagger } from './common/setup-swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.enableShutdownHooks();
  app.useGlobalFilters(new HttpExceptionFilter());
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  setupSwagger(app);
  const port = 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
