import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3001', 'http://localhost:5173'];

  app.enableCors({ origin: corsOrigins, credentials: true });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`OPTIVIEW Backend running on port ${port}`);
}
bootstrap();
