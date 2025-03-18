import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MS_TRIGGER_CLIENTS } from 'src/constant';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: MS_TRIGGER_CLIENTS.RAHAT,
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST,
          port: +process.env.REDIS_PORT,
          password: process.env.REDIS_PASSWORD,
        },
      },
    ]),
  ],

  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
