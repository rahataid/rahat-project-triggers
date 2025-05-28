import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  try {
    const PORT: number = 7080;
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
          password: process.env.REDIS_PASSWORD,
          retryDelay: 3000,
          retryAttempts: 50,
        },
      },
    );
    // app.useGlobalFilters(new RsExceptionFilter());
    app.listen();
    Logger.log(`🚀 Microservice is running on: http://localhost:${PORT}`);
  } catch (error) {
    Logger.error(error);
  }
}
bootstrap();
