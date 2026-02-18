import { TriggerHistoryModule } from './trigger-history.module';
import { TriggerHistoryController } from './trigger-history.controller';
import { TriggerHistoryService } from './trigger-history.service';

describe('TriggerHistoryModule', () => {
  let triggerHistoryModule: TriggerHistoryModule;

  beforeEach(() => {
    triggerHistoryModule = new TriggerHistoryModule();
  });

  it('should be defined', () => {
    expect(triggerHistoryModule).toBeDefined();
  });

  it('should have proper module structure', () => {
    expect(triggerHistoryModule).toBeDefined();
  });

  it('should have correct module metadata for controllers', () => {
    const controllerMetadata = Reflect.getMetadata(
      'controllers',
      TriggerHistoryModule,
    );
    expect(controllerMetadata).toBeDefined();
    expect(Array.isArray(controllerMetadata)).toBe(true);
    expect(controllerMetadata).toContain(TriggerHistoryController);
  });

  it('should have correct module metadata for providers', () => {
    const providerMetadata = Reflect.getMetadata(
      'providers',
      TriggerHistoryModule,
    );
    expect(providerMetadata).toBeDefined();
    expect(Array.isArray(providerMetadata)).toBe(true);
    expect(providerMetadata).toContain(TriggerHistoryService);
  });

  it('should have correct module metadata for exports', () => {
    const exportMetadata = Reflect.getMetadata('exports', TriggerHistoryModule);
    expect(exportMetadata).toBeDefined();
    expect(Array.isArray(exportMetadata)).toBe(true);
    expect(exportMetadata).toContain(TriggerHistoryService);
  });
});
