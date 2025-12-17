import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { PrismaClientExceptionFilter } from '@lib/database';
import { WinstonModule } from 'nest-winston';
import { loggerInstance } from './helpers/wiston.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance: loggerInstance,
    }),
  });

  const globalPrefix = 'v1';
  app.setGlobalPrefix(globalPrefix);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new PrismaClientExceptionFilter(),
  );

  const config = new DocumentBuilder()
    .setTitle('Rahat Triggers')
    .setDescription('The Rahat Triggers API description')
    .setVersion('1.0')
    .addTag('Triggers')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('swagger', app, documentFactory);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.warn(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.warn(`Swagger UI: http://localhost:${port}/swagger`);
}
bootstrap();
