import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from '@rumsan/prisma';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { SourcesDataModule } from './sources-data.module';
import { SourcesDataService } from './sources-data.service';
import { SourcesDataController } from './sources-data.controller';
import { ScheduleSourcesDataService } from './schedule-sources-data.service';
import { DhmService } from './dhm.service';
import { GlofasService } from './glofas.service';
import { GfhService } from './gfh.service';
import { BQUEUE } from 'src/constant';

describe('SourcesDataModule', () => {
  let module: TestingModule;

  const mockPrismaService = {
    sourcesData: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    source: {
      findFirst: jest.fn(),
    },
    trigger: {
      findUnique: jest.fn(),
    },
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
    process: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    process.env.FLOODS_API_KEY = 'mocked_value';

    module = await Test.createTestingModule({
      imports: [
        SourcesDataModule,
        EventEmitterModule.forRoot({ maxListeners: 10, ignoreErrors: false }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(HttpModule)
      .useValue(mockHttpService)
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider(BullModule.registerQueue({ name: BQUEUE.TRIGGER }))
      .useValue(mockQueue)
      .overrideProvider(EventEmitter2)
      .useValue(mockEventEmitter)
      .compile();
  });

  afterEach(() => {
    delete process.env.FLOODS_API_KEY;
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have SourcesDataService defined', () => {
    const sourcesDataService =
      module.get<SourcesDataService>(SourcesDataService);
    expect(sourcesDataService).toBeDefined();
  });

  it('should have SourcesDataController defined', () => {
    const sourcesDataController = module.get<SourcesDataController>(
      SourcesDataController,
    );
    expect(sourcesDataController).toBeDefined();
  });

  it('should have ScheduleSourcesDataService defined', () => {
    const scheduleSourcesDataService = module.get<ScheduleSourcesDataService>(
      ScheduleSourcesDataService,
    );
    expect(scheduleSourcesDataService).toBeDefined();
  });

  it('should have DhmService defined', () => {
    const dhmService = module.get<DhmService>(DhmService);
    expect(dhmService).toBeDefined();
  });

  it('should have GlofasService defined', () => {
    const glofasService = module.get<GlofasService>(GlofasService);
    expect(glofasService).toBeDefined();
  });

  it('should have GfhService defined', () => {
    const gfhService = module.get<GfhService>(GfhService);
    expect(gfhService).toBeDefined();
  });

  it('should have ConfigService defined', () => {
    const configService = module.get<ConfigService>(ConfigService);
    expect(configService).toBeDefined();
  });

  describe('Module Exports', () => {
    it('should export SourcesDataService', () => {
      const sourcesDataService =
        module.get<SourcesDataService>(SourcesDataService);
      expect(sourcesDataService).toBeInstanceOf(SourcesDataService);
    });

    it('should export ScheduleSourcesDataService', () => {
      const scheduleSourcesDataService = module.get<ScheduleSourcesDataService>(
        ScheduleSourcesDataService,
      );
      expect(scheduleSourcesDataService).toBeInstanceOf(
        ScheduleSourcesDataService,
      );
    });

    it('should export DhmService', () => {
      const dhmService = module.get<DhmService>(DhmService);
      expect(dhmService).toBeInstanceOf(DhmService);
    });

    it('should export GlofasService', () => {
      const glofasService = module.get<GlofasService>(GlofasService);
      expect(glofasService).toBeInstanceOf(GlofasService);
    });

    it('should export GfhService', () => {
      const gfhService = module.get<GfhService>(GfhService);
      expect(gfhService).toBeInstanceOf(GfhService);
    });
  });

  describe('Module Dependencies', () => {
    it('should have HttpModule available', () => {
      const httpModule = module.get(HttpModule, { strict: false });
      expect(httpModule).toBeDefined();
    });

    it('should have PrismaService available', () => {
      const prismaService = module.get<PrismaService>(PrismaService);
      expect(prismaService).toBeDefined();
    });

    it('should have ConfigService available', () => {
      const configService = module.get<ConfigService>(ConfigService);
      expect(configService).toBeDefined();
    });
  });
});
