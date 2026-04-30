import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error','warn','log'] });

  // Sikkerhed
  app.use(helmet());
  app.enableCors({ origin: process.env.APP_URL || '*', credentials: true });

  // Validering
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger API-dokumentation
  const config = new DocumentBuilder()
    .setTitle('Hotel Platform API')
    .setDescription('NestJS backend med Mews PMS integration og GDPR-håndtering')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.APP_PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Hotel Platform API kører på port ${port}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();
