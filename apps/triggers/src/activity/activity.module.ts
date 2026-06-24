import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BullModule } from '@nestjs/bull';
import { BQUEUE, MS_TRIGGER_CLIENTS } from 'src/constant';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: MS_TRIGGER_CLIENTS.RAHAT,
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get('REDIS_HOST'),
            port: configService.get('REDIS_PORT'),
            password: configService.get('REDIS_PASSWORD'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    BullModule.registerQueue({
      name: BQUEUE.ACTIVITY_BULK,
    }),
  ],
  controllers: [ActivityController],
  exports: [ActivityService],
  providers: [ActivityService],
})
export class ActivityModule {}
