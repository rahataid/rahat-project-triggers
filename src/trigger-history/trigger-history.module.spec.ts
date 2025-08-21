import { Test, TestingModule } from '@nestjs/testing';
import { TriggerHistoryModule } from './trigger-history.module';
import { TriggerHistoryController } from './trigger-history.controller';
import { TriggerHistoryService } from './trigger-history.service';
import { PrismaService } from '@rumsan/prisma';

describe('TriggerHistoryModule', () => {
  let triggerHistoryModule: TriggerHistoryModule;

  beforeEach(async () => {
    triggerHistoryModule = new TriggerHistoryModule();
  });

  it('should be defined', () => {
    expect(triggerHistoryModule).toBeDefined();
  });

  it('should have proper module structure', () => {
    expect(triggerHistoryModule).toBeDefined();
  });

  it('should have correct module metadata', () => {
    const controllerMetadata = Reflect.getMetadata('controllers', TriggerHistoryModule);
    const providerMetadata = Reflect.getMetadata('providers', TriggerHistoryModule);

    expect(controllerMetadata).toContain(TriggerHistoryController);
    expect(providerMetadata).toContain(TriggerHistoryService);
    expect(providerMetadata).toContain(PrismaService);
  });

  it('should export TriggerHistoryService', () => {
    const exportMetadata = Reflect.getMetadata('exports', TriggerHistoryModule);
    expect(exportMetadata).toContain(TriggerHistoryService);
  });

  describe('Module Integration', () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [TriggerHistoryModule],
      }).compile();
    });

    it('should create TriggerHistoryController', () => {
      const controller = module.get<TriggerHistoryController>(TriggerHistoryController);
      expect(controller).toBeDefined();
    });

    it('should create TriggerHistoryService', () => {
      const service = module.get<TriggerHistoryService>(TriggerHistoryService);
      expect(service).toBeDefined();
    });

    it('should provide PrismaService', () => {
      const prismaService = module.get<PrismaService>(PrismaService);
      expect(prismaService).toBeDefined();
    });
  });
}); 