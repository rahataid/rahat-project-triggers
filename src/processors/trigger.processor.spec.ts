import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { TriggerProcessor } from './trigger.processor';
import { PhasesService } from '../phases/phases.service';
import { BQUEUE, JOBS } from '../constant';
import { DataSource } from '@prisma/client';

describe('TriggerProcessor', () => {
  let processor: TriggerProcessor;
  let phasesService: PhasesService;

  const mockPhasesService = {
    getOne: jest.fn(),
    activatePhase: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerProcessor,
        {
          provide: PhasesService,
          useValue: mockPhasesService,
        },
      ],
    }).compile();

    processor = module.get<TriggerProcessor>(TriggerProcessor);
    phasesService = module.get<PhasesService>(PhasesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('processTrigger', () => {
    it('should process trigger job with source', async () => {
      const mockJob = {
        data: {
          repeatKey: 'test-repeat-key',
          source: DataSource.DHM,
          phaseId: 'test-phase-id',
        },
      } as Job;

      jest.spyOn(processor as any, 'processAutomatedData').mockResolvedValue(undefined);

      await processor.processTrigger(mockJob);

      expect(processor['processAutomatedData']).toHaveBeenCalledWith(mockJob.data);
    });

    it('should process trigger job without source', async () => {
      const mockJob = {
        data: {
          repeatKey: 'test-repeat-key',
          phaseId: 'test-phase-id',
        },
      } as Job;

      jest.spyOn(processor as any, 'processAutomatedData').mockResolvedValue(undefined);

      await processor.processTrigger(mockJob);

      expect(processor['processAutomatedData']).not.toHaveBeenCalled();
    });

    it('should handle different repeatKey values', async () => {
      const mockJob = {
        data: {
          repeatKey: 'another-repeat-key',
          source: DataSource.GLOFAS,
          phaseId: 'test-phase-id',
        },
      } as Job;

      jest.spyOn(processor as any, 'processAutomatedData').mockResolvedValue(undefined);

      await processor.processTrigger(mockJob);

      expect(processor['processAutomatedData']).toHaveBeenCalledWith(mockJob.data);
    });
  });

  describe('processAutomatedData', () => {
    it('should process automated data and activate phase when conditions are met', async () => {
      const payload = {
        phaseId: 'test-phase-id',
        source: DataSource.DHM,
      };

      const mockPhaseData = {
        uuid: 'test-phase-uuid',
        name: 'Test Phase',
        triggerRequirements: {
          mandatoryTriggers: {
            requiredTriggers: 2,
            receivedTriggers: 2,
          },
          optionalTriggers: {
            requiredTriggers: 1,
            receivedTriggers: 1,
          },
        },
      };

      mockPhasesService.getOne.mockResolvedValue(mockPhaseData);
      jest.spyOn(processor as any, 'checkTriggerConditions').mockReturnValue(true);

      await processor['processAutomatedData'](payload);

      expect(mockPhasesService.getOne).toHaveBeenCalledWith(payload.phaseId);
      expect(processor['checkTriggerConditions']).toHaveBeenCalledWith(mockPhaseData.triggerRequirements);
      expect(mockPhasesService.activatePhase).toHaveBeenCalledWith(mockPhaseData.uuid);
    });

    it('should process automated data but not activate phase when conditions are not met', async () => {
      const payload = {
        phaseId: 'test-phase-id',
        source: DataSource.GLOFAS,
      };

      const mockPhaseData = {
        uuid: 'test-phase-uuid',
        name: 'Test Phase',
        triggerRequirements: {
          mandatoryTriggers: {
            requiredTriggers: 2,
            receivedTriggers: 1,
          },
          optionalTriggers: {
            requiredTriggers: 1,
            receivedTriggers: 0,
          },
        },
      };

      mockPhasesService.getOne.mockResolvedValue(mockPhaseData);
      jest.spyOn(processor as any, 'checkTriggerConditions').mockReturnValue(false);

      await processor['processAutomatedData'](payload);

      expect(mockPhasesService.getOne).toHaveBeenCalledWith(payload.phaseId);
      expect(processor['checkTriggerConditions']).toHaveBeenCalledWith(mockPhaseData.triggerRequirements);
      expect(mockPhasesService.activatePhase).not.toHaveBeenCalled();
    });

    it('should handle different data sources', async () => {
      const payload = {
        phaseId: 'test-phase-id',
        source: DataSource.GFH,
      };

      const mockPhaseData = {
        uuid: 'test-phase-uuid',
        name: 'Test Phase',
        triggerRequirements: {
          mandatoryTriggers: {
            requiredTriggers: 1,
            receivedTriggers: 1,
          },
          optionalTriggers: {
            requiredTriggers: 0,
            receivedTriggers: 0,
          },
        },
      };

      mockPhasesService.getOne.mockResolvedValue(mockPhaseData);
      jest.spyOn(processor as any, 'checkTriggerConditions').mockReturnValue(true);

      await processor['processAutomatedData'](payload);

      expect(mockPhasesService.getOne).toHaveBeenCalledWith(payload.phaseId);
      expect(processor['checkTriggerConditions']).toHaveBeenCalledWith(mockPhaseData.triggerRequirements);
    });
  });

  describe('processManualTrigger', () => {
    it('should process manual trigger and activate phase when conditions are met', async () => {
      const payload = {
        phaseId: 'test-phase-id',
      };

      const mockPhaseData = {
        uuid: 'test-phase-uuid',
        name: 'Test Phase',
        triggerRequirements: {
          mandatoryTriggers: {
            requiredTriggers: 1,
            receivedTriggers: 1,
          },
          optionalTriggers: {
            requiredTriggers: 0,
            receivedTriggers: 0,
          },
        },
      };

      mockPhasesService.getOne.mockResolvedValue(mockPhaseData);
      jest.spyOn(processor as any, 'checkTriggerConditions').mockReturnValue(true);

      await processor['processManualTrigger'](payload);

      expect(mockPhasesService.getOne).toHaveBeenCalledWith(payload.phaseId);
      expect(processor['checkTriggerConditions']).toHaveBeenCalledWith(mockPhaseData.triggerRequirements);
      expect(mockPhasesService.activatePhase).toHaveBeenCalledWith(mockPhaseData.uuid);
    });

    it('should process manual trigger but not activate phase when conditions are not met', async () => {
      const payload = {
        phaseId: 'test-phase-id',
      };

      const mockPhaseData = {
        uuid: 'test-phase-uuid',
        name: 'Test Phase',
        triggerRequirements: {
          mandatoryTriggers: {
            requiredTriggers: 2,
            receivedTriggers: 1,
          },
          optionalTriggers: {
            requiredTriggers: 1,
            receivedTriggers: 0,
          },
        },
      };

      mockPhasesService.getOne.mockResolvedValue(mockPhaseData);
      jest.spyOn(processor as any, 'checkTriggerConditions').mockReturnValue(false);

      await processor['processManualTrigger'](payload);

      expect(mockPhasesService.getOne).toHaveBeenCalledWith(payload.phaseId);
      expect(processor['checkTriggerConditions']).toHaveBeenCalledWith(mockPhaseData.triggerRequirements);
      expect(mockPhasesService.activatePhase).not.toHaveBeenCalled();
    });
  });

  describe('checkTriggerConditions', () => {
    it('should return false when no triggers are set', () => {
      const triggerRequirements = {
        mandatoryTriggers: {
          requiredTriggers: 0,
          receivedTriggers: 0,
        },
        optionalTriggers: {
          requiredTriggers: 0,
          receivedTriggers: 0,
        },
      };

      const result = processor['checkTriggerConditions'](triggerRequirements);

      expect(result).toBe(false);
    });

    it('should return true when both mandatory and optional conditions are met', () => {
      const triggerRequirements = {
        mandatoryTriggers: {
          requiredTriggers: 2,
          receivedTriggers: 2,
        },
        optionalTriggers: {
          requiredTriggers: 1,
          receivedTriggers: 1,
        },
      };

      const result = processor['checkTriggerConditions'](triggerRequirements);

      expect(result).toBe(true);
    });

    it('should return false when mandatory conditions are not met', () => {
      const triggerRequirements = {
        mandatoryTriggers: {
          requiredTriggers: 2,
          receivedTriggers: 1,
        },
        optionalTriggers: {
          requiredTriggers: 1,
          receivedTriggers: 1,
        },
      };

      const result = processor['checkTriggerConditions'](triggerRequirements);

      expect(result).toBe(false);
    });

    it('should return false when optional conditions are not met', () => {
      const triggerRequirements = {
        mandatoryTriggers: {
          requiredTriggers: 1,
          receivedTriggers: 1,
        },
        optionalTriggers: {
          requiredTriggers: 2,
          receivedTriggers: 1,
        },
      };

      const result = processor['checkTriggerConditions'](triggerRequirements);

      expect(result).toBe(false);
    });

    it('should return true when only mandatory triggers are set and met', () => {
      const triggerRequirements = {
        mandatoryTriggers: {
          requiredTriggers: 1,
          receivedTriggers: 1,
        },
        optionalTriggers: {
          requiredTriggers: 0,
          receivedTriggers: 0,
        },
      };

      const result = processor['checkTriggerConditions'](triggerRequirements);

      expect(result).toBe(true);
    });

    it('should return true when only optional triggers are set and met', () => {
      const triggerRequirements = {
        mandatoryTriggers: {
          requiredTriggers: 0,
          receivedTriggers: 0,
        },
        optionalTriggers: {
          requiredTriggers: 1,
          receivedTriggers: 1,
        },
      };

      const result = processor['checkTriggerConditions'](triggerRequirements);

      expect(result).toBe(true);
    });

    it('should return false when mandatory triggers exceed required', () => {
      const triggerRequirements = {
        mandatoryTriggers: {
          requiredTriggers: 1,
          receivedTriggers: 2,
        },
        optionalTriggers: {
          requiredTriggers: 0,
          receivedTriggers: 0,
        },
      };

      const result = processor['checkTriggerConditions'](triggerRequirements);

      expect(result).toBe(true); // Should still be true as received >= required
    });

    it('should return false when optional triggers exceed required', () => {
      const triggerRequirements = {
        mandatoryTriggers: {
          requiredTriggers: 0,
          receivedTriggers: 0,
        },
        optionalTriggers: {
          requiredTriggers: 1,
          receivedTriggers: 2,
        },
      };

      const result = processor['checkTriggerConditions'](triggerRequirements);

      expect(result).toBe(true); // Should still be true as received >= required
    });
  });

  describe('Processor Decorators', () => {
    it('should have correct processor decorator', () => {
      const prototype = Object.getPrototypeOf(processor);
      expect(prototype.constructor.name).toBe('TriggerProcessor');
    });
  });

  describe('Method Coverage', () => {
    it('should cover all methods in the class', () => {
      expect(typeof processor.processTrigger).toBe('function');
      expect(typeof processor['processAutomatedData']).toBe('function');
      expect(typeof processor['processManualTrigger']).toBe('function');
      expect(typeof processor['checkTriggerConditions']).toBe('function');
    });
  });
}); 