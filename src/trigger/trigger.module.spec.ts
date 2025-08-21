import { Test, TestingModule } from '@nestjs/testing';
import { TriggerModule } from './trigger.module';
import { TriggerController } from './trigger.controller';
import { TriggerService } from './trigger.service';

describe('TriggerModule', () => {
  let triggerModule: TriggerModule;

  beforeEach(async () => {
    triggerModule = new TriggerModule();
  });

  it('should be defined', () => {
    expect(triggerModule).toBeDefined();
  });

  it('should have proper module structure', () => {
    expect(triggerModule).toBeDefined();
  });

  it('should have correct module metadata', () => {
    const controllerMetadata = Reflect.getMetadata('controllers', TriggerModule);
    const providerMetadata = Reflect.getMetadata('providers', TriggerModule);

    expect(controllerMetadata).toContain(TriggerController);
    expect(providerMetadata).toContain(TriggerService);
  });

  it('should have proper module imports', () => {
    const moduleMetadata = Reflect.getMetadata('imports', TriggerModule);
    expect(moduleMetadata).toBeDefined();
  });

  it('should export TriggerService', () => {
    const exportMetadata = Reflect.getMetadata('exports', TriggerModule);
    expect(exportMetadata).toContain(TriggerService);
  });
}); 