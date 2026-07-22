import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
  });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`CRM API listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Health: http://localhost:${port}/health`);
}
bootstrap();
