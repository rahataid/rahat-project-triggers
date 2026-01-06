import { Module, DynamicModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { DhmWaterLevelAdapter, DhmRainfallAdapter } from "./adapters";
import {
  HealthMonitoringService,
  SettingsModule,
  SettingsService,
} from "@lib/core";

const adapters = [DhmRainfallAdapter, DhmWaterLevelAdapter];

@Module({})
export class DhmModule {
  /**
   * Register DhmModule globally with HttpModule.
   * Note: PrismaModule must be globally registered in AppModule for DI to work.
   * We don't import it here - it should come from the global scope.
   */
  static forRoot(): DynamicModule {
    return {
      global: true,
      module: DhmModule,
      imports: [HttpModule, SettingsModule],
      providers: [...adapters, SettingsService, HealthMonitoringService],
      exports: [...adapters],
    };
  }

  /**
   * Register DhmModule as a feature module (non-global).
   * PrismaService will be available due to global registration in AppModule.
   */
  static forFeature(): DynamicModule {
    return {
      module: DhmModule,
      imports: [SettingsModule],
      providers: [...adapters, HealthMonitoringService],
      exports: [...adapters],
    };
  }
}
