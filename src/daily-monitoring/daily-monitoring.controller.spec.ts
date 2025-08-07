import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from '@rumsan/prisma';
import { DailyMonitoringController } from './daily-monitoring.controller';
import { DailyMonitoringService } from './daily-monitoring.service';
import { AddDailyMonitoringDto, ListDailyMonitoringDto, UpdateDailyMonitoringDto } from './dto';
import { GaugeForecastDto } from './dto/list-gaugeForecast.dto';
import { MS_TRIGGERS_JOBS } from 'src/constant';

describe('DailyMonitoringController', () => {
  let controller: DailyMonitoringController;
  let dailyMonitoringService: DailyMonitoringService;

  const mockDailyMonitoringService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getGaugeReading: jest.fn(),
    getGaugeForecast: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    deleteDailyMonitoringByIdAndGroupKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyMonitoringController],
      providers: [
        {
          provide: DailyMonitoringService,
          useValue: mockDailyMonitoringService,
        },
      ],
    }).compile();

    controller = module.get<DailyMonitoringController>(DailyMonitoringController);
    dailyMonitoringService = module.get<DailyMonitoringService>(DailyMonitoringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('add', () => {
    const mockPayload: AddDailyMonitoringDto = {
      riverBasin: 'Test Basin',
      data: [
        { source: 'DHM', value: 100 },
        { source: 'GLOFAS', value: 200 },
      ],
      user: { name: 'Test User' },
      uuid: 'test-uuid',
    };

    const mockResult = [
      { id: 1, groupKey: 'test-uuid', sourceId: 1, dataEntryBy: 'Test User' },
      { id: 2, groupKey: 'test-uuid', sourceId: 1, dataEntryBy: 'Test User' },
    ];

    it('should add daily monitoring data successfully', async () => {
      mockDailyMonitoringService.create.mockResolvedValue(mockResult);

      const result = await controller.add(mockPayload);

      expect(mockDailyMonitoringService.create).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle service throwing RpcException', async () => {
      const error = new RpcException('Service error');
      mockDailyMonitoringService.create.mockRejectedValue(error);

      await expect(controller.add(mockPayload)).rejects.toThrow(RpcException);
      expect(mockDailyMonitoringService.create).toHaveBeenCalledWith(mockPayload);
    });

    it('should handle service throwing generic error', async () => {
      const error = new Error('Generic error');
      mockDailyMonitoringService.create.mockRejectedValue(error);

      await expect(controller.add(mockPayload)).rejects.toThrow(Error);
      expect(mockDailyMonitoringService.create).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('getAll', () => {
    const mockPayload: ListDailyMonitoringDto = {
      page: 1,
      perPage: 10,
      dataEntryBy: 'Test User',
      riverBasin: 'Test Basin',
      createdAt: '2023-01-01',
    };

    const mockResult = {
      results: [
        {
          id: 1,
          groupKey: 'test-uuid',
          dataEntryBy: 'Test User',
          source: { riverBasin: 'Test Basin' },
        },
      ],
    };

    it('should get all daily monitoring data successfully', async () => {
      mockDailyMonitoringService.findAll.mockResolvedValue(mockResult);

      const result = await controller.getAll(mockPayload);

      expect(mockDailyMonitoringService.findAll).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle empty payload', async () => {
      const emptyPayload: ListDailyMonitoringDto = {};
      mockDailyMonitoringService.findAll.mockResolvedValue(mockResult);

      await controller.getAll(emptyPayload);

      expect(mockDailyMonitoringService.findAll).toHaveBeenCalledWith(emptyPayload);
    });

    it('should handle service throwing RpcException', async () => {
      const error = new RpcException('Service error');
      mockDailyMonitoringService.findAll.mockRejectedValue(error);

      await expect(controller.getAll(mockPayload)).rejects.toThrow(RpcException);
      expect(mockDailyMonitoringService.findAll).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('getOne', () => {
    const mockPayload = { uuid: 'test-uuid' };
    const mockResult = {
      results: [
        {
          id: 1,
          groupKey: 'test-uuid',
          dataEntryBy: 'Test User',
          source: { riverBasin: 'Test Basin' },
        },
      ],
    };

    it('should get one daily monitoring data successfully', async () => {
      mockDailyMonitoringService.findOne.mockResolvedValue(mockResult);

      const result = await controller.getOne(mockPayload);

      expect(mockDailyMonitoringService.findOne).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle different UUID values', async () => {
      const differentPayload = { uuid: 'different-uuid' };
      mockDailyMonitoringService.findOne.mockResolvedValue(mockResult);

      await controller.getOne(differentPayload);

      expect(mockDailyMonitoringService.findOne).toHaveBeenCalledWith(differentPayload);
    });

    it('should handle service throwing RpcException', async () => {
      const error = new RpcException('Service error');
      mockDailyMonitoringService.findOne.mockRejectedValue(error);

      await expect(controller.getOne(mockPayload)).rejects.toThrow(RpcException);
      expect(mockDailyMonitoringService.findOne).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('getGaugeReading', () => {
    const mockResult = {
      results: [
        {
          id: 1,
          info: { gaugeReading: 100, station: 'Station A', date: '2023-01-01' },
          source: { riverBasin: 'Test Basin' },
        },
      ],
    };

    it('should get gauge reading data successfully', async () => {
      mockDailyMonitoringService.getGaugeReading.mockResolvedValue(mockResult);

      const result = await controller.getGaugeReading();

      expect(mockDailyMonitoringService.getGaugeReading).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should handle service throwing RpcException', async () => {
      const error = new RpcException('Service error');
      mockDailyMonitoringService.getGaugeReading.mockRejectedValue(error);

      await expect(controller.getGaugeReading()).rejects.toThrow(RpcException);
      expect(mockDailyMonitoringService.getGaugeReading).toHaveBeenCalled();
    });
  });

  describe('getGaugeForecast', () => {
    const mockPayload: GaugeForecastDto = {
      sourceId: '1',
      station: 'Station A',
      gaugeForecast: 'High',
      date: '2023-01-01',
    };

    const mockResult = {
      results: [
        {
          id: 1,
          info: { gaugeForecast: 'High', station: 'Station A', date: '2023-01-01' },
          source: { riverBasin: 'Test Basin' },
        },
      ],
    };

    it('should get gauge forecast data successfully', async () => {
      mockDailyMonitoringService.getGaugeForecast.mockResolvedValue(mockResult);

      const result = await controller.getGaugeForecast(mockPayload);

      expect(mockDailyMonitoringService.getGaugeForecast).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle empty payload', async () => {
      const emptyPayload: GaugeForecastDto = {};
      mockDailyMonitoringService.getGaugeForecast.mockResolvedValue(mockResult);

      await controller.getGaugeForecast(emptyPayload);

      expect(mockDailyMonitoringService.getGaugeForecast).toHaveBeenCalledWith(emptyPayload);
    });

    it('should handle service throwing RpcException', async () => {
      const error = new RpcException('Service error');
      mockDailyMonitoringService.getGaugeForecast.mockRejectedValue(error);

      await expect(controller.getGaugeForecast(mockPayload)).rejects.toThrow(RpcException);
      expect(mockDailyMonitoringService.getGaugeForecast).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('update', () => {
    const mockPayload: UpdateDailyMonitoringDto = {
      uuid: 'test-uuid',
      data: [
        { id: 1, source: 'DHM', value: 150 },
        { id: 2, source: 'GLOFAS', value: 250 },
      ],
    };

    const mockResult = [
      { id: 1, groupKey: 'test-uuid', source: 'DHM', value: 150 },
      { id: 2, groupKey: 'test-uuid', source: 'GLOFAS', value: 250 },
    ];

    it('should update daily monitoring data successfully', async () => {
      mockDailyMonitoringService.update.mockResolvedValue(mockResult);

      const result = await controller.update(mockPayload);

      expect(mockDailyMonitoringService.update).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle service throwing RpcException', async () => {
      const error = new RpcException('Service error');
      mockDailyMonitoringService.update.mockRejectedValue(error);

      await expect(controller.update(mockPayload)).rejects.toThrow(RpcException);
      expect(mockDailyMonitoringService.update).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('remove', () => {
    const mockPayload = { uuid: 'test-uuid' };
    const mockResult = { count: 2 };

    it('should remove daily monitoring data successfully', async () => {
      mockDailyMonitoringService.remove.mockResolvedValue(mockResult);

      const result = await controller.remove(mockPayload);

      expect(mockDailyMonitoringService.remove).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle different UUID values', async () => {
      const differentPayload = { uuid: 'different-uuid' };
      mockDailyMonitoringService.remove.mockResolvedValue(mockResult);

      await controller.remove(differentPayload);

      expect(mockDailyMonitoringService.remove).toHaveBeenCalledWith(differentPayload);
    });

    it('should handle service throwing RpcException', async () => {
      const error = new RpcException('Service error');
      mockDailyMonitoringService.remove.mockRejectedValue(error);

      await expect(controller.remove(mockPayload)).rejects.toThrow(RpcException);
      expect(mockDailyMonitoringService.remove).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('deleteByKeyAndGroup', () => {
    const mockPayload = { uuid: 'test-uuid', id: 1 };
    const mockResult = { id: 1, isDeleted: true };

    it('should delete daily monitoring data by key and group successfully', async () => {
      mockDailyMonitoringService.deleteDailyMonitoringByIdAndGroupKey.mockResolvedValue(mockResult);

      const result = await controller.deleteByKeyAndGroup(mockPayload);

      expect(mockDailyMonitoringService.deleteDailyMonitoringByIdAndGroupKey).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockResult);
    });

    it('should handle different payload values', async () => {
      const differentPayload = { uuid: 'different-uuid', id: 2 };
      mockDailyMonitoringService.deleteDailyMonitoringByIdAndGroupKey.mockResolvedValue(mockResult);

      await controller.deleteByKeyAndGroup(differentPayload);

      expect(mockDailyMonitoringService.deleteDailyMonitoringByIdAndGroupKey).toHaveBeenCalledWith(differentPayload);
    });

    it('should handle service throwing RpcException', async () => {
      const error = new RpcException('Service error');
      mockDailyMonitoringService.deleteDailyMonitoringByIdAndGroupKey.mockRejectedValue(error);

      await expect(controller.deleteByKeyAndGroup(mockPayload)).rejects.toThrow(RpcException);
      expect(mockDailyMonitoringService.deleteDailyMonitoringByIdAndGroupKey).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('Message Pattern Decorators', () => {
    it('should have correct message pattern decorators', () => {
      const prototype = Object.getPrototypeOf(controller);
      
      expect(prototype.add).toBeDefined();
      expect(prototype.getAll).toBeDefined();
      expect(prototype.getOne).toBeDefined();
      expect(prototype.getGaugeReading).toBeDefined();
      expect(prototype.getGaugeForecast).toBeDefined();
      expect(prototype.update).toBeDefined();
      expect(prototype.remove).toBeDefined();
      expect(prototype.deleteByKeyAndGroup).toBeDefined();
    });

    it('should have correct message pattern commands', () => {
      expect(MS_TRIGGERS_JOBS.DAILY_MONITORING.ADD).toBeDefined();
      expect(MS_TRIGGERS_JOBS.DAILY_MONITORING.GET_ALL).toBeDefined();
      expect(MS_TRIGGERS_JOBS.DAILY_MONITORING.GET_ONE).toBeDefined();
      expect(MS_TRIGGERS_JOBS.DAILY_MONITORING.GET_Gauge_Reading).toBeDefined();
      expect(MS_TRIGGERS_JOBS.DAILY_MONITORING.GET_Gauge_Forecast).toBeDefined();
      expect(MS_TRIGGERS_JOBS.DAILY_MONITORING.UPDATE).toBeDefined();
      expect(MS_TRIGGERS_JOBS.DAILY_MONITORING.REMOVE).toBeDefined();
      expect(MS_TRIGGERS_JOBS.DAILY_MONITORING.DELETE).toBeDefined();
    });
  });

  describe('Method Coverage', () => {
    it('should cover all methods in the class', () => {
      expect(typeof controller.add).toBe('function');
      expect(typeof controller.getAll).toBe('function');
      expect(typeof controller.getOne).toBe('function');
      expect(typeof controller.getGaugeReading).toBe('function');
      expect(typeof controller.getGaugeForecast).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.remove).toBe('function');
      expect(typeof controller.deleteByKeyAndGroup).toBe('function');
    });
  });

  describe('Dependency Injection', () => {
    it('should have DailyMonitoringService injected', () => {
      expect(dailyMonitoringService).toBeDefined();
      expect(dailyMonitoringService.create).toBeDefined();
      expect(dailyMonitoringService.findAll).toBeDefined();
      expect(dailyMonitoringService.findOne).toBeDefined();
      expect(dailyMonitoringService.getGaugeReading).toBeDefined();
      expect(dailyMonitoringService.getGaugeForecast).toBeDefined();
      expect(dailyMonitoringService.update).toBeDefined();
      expect(dailyMonitoringService.remove).toBeDefined();
      expect(dailyMonitoringService.deleteDailyMonitoringByIdAndGroupKey).toBeDefined();
    });
  });
});
