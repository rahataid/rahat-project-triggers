import { DailyMonitoringModule } from './daily-monitoring.module';
import { DailyMonitoringController } from './daily-monitoring.controller';
import { DailyMonitoringService } from './daily-monitoring.service';

describe('DailyMonitoringModule', () => {
  let dailyMonitoringModule: DailyMonitoringModule;

  beforeEach(() => {
    dailyMonitoringModule = new DailyMonitoringModule();
  });

  it('should be defined', () => {
    expect(dailyMonitoringModule).toBeDefined();
  });

  it('should have proper module structure', () => {
    expect(dailyMonitoringModule).toBeDefined();
  });

  it('should have correct module metadata for controllers', () => {
    const controllerMetadata = Reflect.getMetadata(
      'controllers',
      DailyMonitoringModule,
    );
    expect(controllerMetadata).toBeDefined();
    expect(Array.isArray(controllerMetadata)).toBe(true);
    expect(controllerMetadata).toContain(DailyMonitoringController);
  });

  it('should have correct module metadata for providers', () => {
    const providerMetadata = Reflect.getMetadata(
      'providers',
      DailyMonitoringModule,
    );
    expect(providerMetadata).toBeDefined();
    expect(Array.isArray(providerMetadata)).toBe(true);
    expect(providerMetadata).toContain(DailyMonitoringService);
  });
});
