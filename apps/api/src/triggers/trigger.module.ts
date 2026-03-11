import { Module } from '@nestjs/common';
import { TriggersController } from './triggers.controller';
import { TriggersService } from './trigger.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

const TRIGGERS_MICROSERVICE = 'TRIGGERS_MICROSERVICE';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: TRIGGERS_MICROSERVICE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('REDIS_HOST'),
            port: Number(configService.get<string>('REDIS_PORT')),
            password: configService.get<string>('REDIS_PASSWORD'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [TriggersController],
  providers: [TriggersService],
})
export class TriggersModule {}
