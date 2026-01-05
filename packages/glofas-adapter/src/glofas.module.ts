import { Module, DynamicModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GlofasAdapter } from './glofas.adapter';
import {
  HealthMonitoringService,
  SettingsModule,
  SettingsService,
} from '@lib/core';

const adapters = [GlofasAdapter];

@Module({})
export class GlofasModule {
  /**
   * Register GlofasModule globally with HttpModule.
   * Note: PrismaModule must be globally registered in AppModule for DI to work.
   * We don't import it here - it should come from the global scope.
   */
  static forRoot(): DynamicModule {
    return {
      global: true,
      module: GlofasModule,
      imports: [HttpModule, SettingsModule],
      providers: [...adapters, SettingsService, HealthMonitoringService],
      exports: [...adapters],
    };
  }

  /**
   * Register GlofasModule as a feature module (non-global).
   * PrismaService will be available due to global registration in AppModule.
   */
  static forFeature(): DynamicModule {
    return {
      module: GlofasModule,
      imports: [SettingsModule],
      providers: [...adapters, HealthMonitoringService],
      exports: [...adapters],
    };
  }
}
