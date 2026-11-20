import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const swaggerPath = 'api/docs';

const buildSwaggerConfig = () =>
  new DocumentBuilder()
    .setTitle('Stellode API')
    .setDescription('REST API анализа зависимостей между сервисами, фичами, компонентами и приложениями.')
    .setVersion('1.0')
    .build();

export const setupSwagger = (app: INestApplication): void => {
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  SwaggerModule.setup(swaggerPath, app, document);
};
