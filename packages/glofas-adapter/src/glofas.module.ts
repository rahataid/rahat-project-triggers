import { Module, DynamicModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GlofasAdapter } from './glofas.adapter';
import { GlofasFtpService } from './ftp/glofas-ftp.service';
import {
  HealthMonitoringService,
  SettingsModule,
  SettingsService,
} from '@lib/core';

const adapters = [GlofasAdapter];
const providers = [...adapters, GlofasFtpService, SettingsService, HealthMonitoringService];

@Module({})
export class GlofasModule {
  static forRoot(): DynamicModule {
    return {
      global: true,
      module: GlofasModule,
      imports: [HttpModule, SettingsModule],
      providers,
      exports: [...adapters, GlofasFtpService],
    };
  }

}
