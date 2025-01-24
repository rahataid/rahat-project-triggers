import { NestFactory } from '@nestjs/core';
import { ResponseTransformInterceptor } from '@rumsan/extensions/interceptors';
import { RsExceptionFilter } from '@rumsan/extensions/exceptions';

import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

const port = process.env.PORT || 3333;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api/v1';
  app.enableCors();

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.REDIS,
      options: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
    },
    { inheritAppConfig: true },
  );

  // app.use(bodyParser.json({ limit: '50mb' }));
  // app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new RsExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.setGlobalPrefix(globalPrefix);

  console.log(process.env.NODE_ENV);
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Rahat Triggers')
      .setDescription('API service for Rahat Triggers')
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', name: 'app-id', in: 'header' }, 'app-id')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('/swagger', app, document);
  }

  await app.startAllMicroservices();
  await app.listen(port);
  console.log(
    `Application is running on:  http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
