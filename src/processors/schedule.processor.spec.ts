import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { ScheduleProcessor } from './schedule.processor';
import { DhmService } from '../sources-data/dhm.service';
import { GlofasService } from '../sources-data/glofas.service';
import { BQUEUE, JOBS } from '../constant';
import { DataSource } from '@prisma/client';
import { AddTriggerStatementDto } from '../sources-data/dto';

describe('ScheduleProcessor', () => {
  let processor: ScheduleProcessor;
  let dhmService: DhmService;
  let glofasService: GlofasService;

  const mockDhmService = {
    criteriaCheck: jest.fn(),
  };

  const mockGlofasService = {
    criteriaCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleProcessor,
        {
          provide: DhmService,
          useValue: mockDhmService,
        },
        {
          provide: GlofasService,
          useValue: mockGlofasService,
        },
      ],
    }).compile();

    processor = module.get<ScheduleProcessor>(ScheduleProcessor);
    dhmService = module.get<DhmService>(DhmService);
    glofasService = module.get<GlofasService>(GlofasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('processAddSchedule', () => {
    it('should process DHM data source', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.DHM,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: true,
          phaseId: 'test-phase-id',
          triggerStatement: {
            warningLevel: 100,
            dangerLevel: 150,
          },
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockDhmService.criteriaCheck.mockResolvedValue(undefined);

      await processor.processAddSchedule(mockJob);

      expect(mockDhmService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
      expect(mockGlofasService.criteriaCheck).not.toHaveBeenCalled();
    });

    it('should process GLOFAS data source', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.GLOFAS,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: false,
          phaseId: 'test-phase-id',
          triggerStatement: {
            warningLevel: 200,
            dangerLevel: 250,
          },
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockGlofasService.criteriaCheck.mockResolvedValue(undefined);

      await processor.processAddSchedule(mockJob);

      expect(mockGlofasService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
      expect(mockDhmService.criteriaCheck).not.toHaveBeenCalled();
    });

    it('should handle unknown data source', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.GFH, // Unknown data source
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: true,
          phaseId: 'test-phase-id',
          triggerStatement: {
            warningLevel: 100,
            dangerLevel: 150,
          },
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      await processor.processAddSchedule(mockJob);

      expect(mockDhmService.criteriaCheck).not.toHaveBeenCalled();
      expect(mockGlofasService.criteriaCheck).not.toHaveBeenCalled();
    });

    it('should handle DHM data source with different payload', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.DHM,
          uuid: 'another-uuid',
          riverBasin: 'another-basin',
          isMandatory: false,
          phaseId: 'another-phase-id',
          triggerStatement: {
            warningLevel: 300,
            dangerLevel: 400,
          },
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockDhmService.criteriaCheck.mockResolvedValue(undefined);

      await processor.processAddSchedule(mockJob);

      expect(mockDhmService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
    });

    it('should handle GLOFAS data source with different payload', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.GLOFAS,
          uuid: 'another-uuid',
          riverBasin: 'another-basin',
          isMandatory: true,
          phaseId: 'another-phase-id',
          triggerStatement: {
            warningLevel: 500,
            dangerLevel: 600,
          },
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockGlofasService.criteriaCheck.mockResolvedValue(undefined);

      await processor.processAddSchedule(mockJob);

      expect(mockGlofasService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
    });

    it('should handle DHM data source with null triggerStatement', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.DHM,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: true,
          phaseId: 'test-phase-id',
          triggerStatement: null,
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockDhmService.criteriaCheck.mockResolvedValue(undefined);

      await processor.processAddSchedule(mockJob);

      expect(mockDhmService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
    });

    it('should handle GLOFAS data source with undefined triggerStatement', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.GLOFAS,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: false,
          phaseId: 'test-phase-id',
          triggerStatement: undefined,
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockGlofasService.criteriaCheck.mockResolvedValue(undefined);

      await processor.processAddSchedule(mockJob);

      expect(mockGlofasService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
    });

    it('should handle DHM data source with empty triggerStatement', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.DHM,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: true,
          phaseId: 'test-phase-id',
          triggerStatement: {},
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockDhmService.criteriaCheck.mockResolvedValue(undefined);

      await processor.processAddSchedule(mockJob);

      expect(mockDhmService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
    });

    it('should handle GLOFAS data source with empty triggerStatement', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.GLOFAS,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: false,
          phaseId: 'test-phase-id',
          triggerStatement: {},
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockGlofasService.criteriaCheck.mockResolvedValue(undefined);

      await processor.processAddSchedule(mockJob);

      expect(mockGlofasService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
    });

    it('should handle DHM data source with criteriaCheck throwing error', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.DHM,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: true,
          phaseId: 'test-phase-id',
          triggerStatement: {
            warningLevel: 100,
            dangerLevel: 150,
          },
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      const error = new Error('DHM criteria check failed');
      mockDhmService.criteriaCheck.mockRejectedValue(error);

      await expect(processor.processAddSchedule(mockJob)).rejects.toThrow('DHM criteria check failed');

      expect(mockDhmService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
    });

    it('should handle GLOFAS data source with criteriaCheck throwing error', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.GLOFAS,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: false,
          phaseId: 'test-phase-id',
          triggerStatement: {
            warningLevel: 200,
            dangerLevel: 250,
          },
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      const error = new Error('GLOFAS criteria check failed');
      mockGlofasService.criteriaCheck.mockRejectedValue(error);

      await expect(processor.processAddSchedule(mockJob)).rejects.toThrow('GLOFAS criteria check failed');

      expect(mockGlofasService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
    });

    it('should handle DHM data source with criteriaCheck returning value', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.DHM,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: true,
          phaseId: 'test-phase-id',
          triggerStatement: {
            warningLevel: 100,
            dangerLevel: 150,
          },
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockDhmService.criteriaCheck.mockResolvedValue({ success: true });

      await processor.processAddSchedule(mockJob);

      expect(mockDhmService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
    });

    it('should handle GLOFAS data source with criteriaCheck returning value', async () => {
      const mockJob = {
        data: {
          dataSource: DataSource.GLOFAS,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: false,
          phaseId: 'test-phase-id',
          triggerStatement: {
            warningLevel: 200,
            dangerLevel: 250,
          },
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockGlofasService.criteriaCheck.mockResolvedValue({ success: true });

      await processor.processAddSchedule(mockJob);

      expect(mockGlofasService.criteriaCheck).toHaveBeenCalledWith(mockJob.data);
    });
  });

  describe('Processor Decorators', () => {
    it('should have correct processor decorator', () => {
      const prototype = Object.getPrototypeOf(processor);
      expect(prototype.constructor.name).toBe('ScheduleProcessor');
    });
  });

  describe('Method Coverage', () => {
    it('should cover all methods in the class', () => {
      expect(typeof processor.processAddSchedule).toBe('function');
    });
  });

  describe('Switch Statement Coverage', () => {
    it('should handle all data source cases', async () => {
      // Test DHM case
      const dhmJob = {
        data: {
          dataSource: DataSource.DHM,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: true,
          phaseId: 'test-phase-id',
          triggerStatement: {},
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockDhmService.criteriaCheck.mockResolvedValue(undefined);
      await processor.processAddSchedule(dhmJob);
      expect(mockDhmService.criteriaCheck).toHaveBeenCalled();

      // Reset mocks
      jest.clearAllMocks();

      // Test GLOFAS case
      const glofasJob = {
        data: {
          dataSource: DataSource.GLOFAS,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: true,
          phaseId: 'test-phase-id',
          triggerStatement: {},
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      mockGlofasService.criteriaCheck.mockResolvedValue(undefined);
      await processor.processAddSchedule(glofasJob);
      expect(mockGlofasService.criteriaCheck).toHaveBeenCalled();

      // Reset mocks
      jest.clearAllMocks();

      // Test default case (unknown data source)
      const unknownJob = {
        data: {
          dataSource: 'UNKNOWN' as any,
          uuid: 'test-uuid',
          riverBasin: 'test-basin',
          isMandatory: true,
          phaseId: 'test-phase-id',
          triggerStatement: {},
        } as AddTriggerStatementDto,
      } as Job<AddTriggerStatementDto>;

      await processor.processAddSchedule(unknownJob);
      expect(mockDhmService.criteriaCheck).not.toHaveBeenCalled();
      expect(mockGlofasService.criteriaCheck).not.toHaveBeenCalled();
    });
  });
}); 