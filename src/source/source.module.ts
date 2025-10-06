import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SourceService } from './source.service';
import { SourceController } from './source.controller';
import { HealthCacheService } from './health-cache.service';

@Module({
  imports: [ConfigModule],
  controllers: [SourceController],
  providers: [
    SourceService,
    HealthCacheService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [SourceService, HealthCacheService],
})
export class SourceModule {}
