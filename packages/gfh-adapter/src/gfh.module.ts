import { Module, DynamicModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GfhAdapter } from './gfh.adapter';
import {
  HealthMonitoringService,
  SettingsModule,
  SettingsService,
} from '@lib/core';

const adapters = [GfhAdapter];

@Module({})
export class GfhModule {
  static forRoot(): DynamicModule {
    return {
      global: true,
      module: GfhModule,
      imports: [HttpModule, SettingsModule],
      providers: [...adapters, SettingsService, HealthMonitoringService],
      exports: [...adapters],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: GfhModule,
      imports: [SettingsModule],
      providers: [...adapters, HealthMonitoringService],
      exports: [...adapters],
    };
  }
}

