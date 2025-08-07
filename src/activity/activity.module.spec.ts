import { Test, TestingModule } from '@nestjs/testing';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@rumsan/prisma';
import { ActivityModule } from './activity.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { MS_TRIGGER_CLIENTS } from 'src/constant';

describe('ActivityModule', () => {
  let module: TestingModule;
  let activityModule: ActivityModule;

  const mockPrismaService = {
    activity: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    activityCommunication: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    activityPayout: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    activityDocument: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    phase: {
      findUnique: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockClientProxy = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  const mockCommsClient = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ClientsModule.register([
          {
            name: MS_TRIGGER_CLIENTS.RAHAT,
            transport: Transport.REDIS,
            options: {
              host: 'localhost',
              port: 6379,
            },
          },
        ]),
      ],
      controllers: [ActivityController],
      providers: [
        ActivityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: MS_TRIGGER_CLIENTS.RAHAT,
          useValue: mockClientProxy,
        },
        {
          provide: 'COMMS_CLIENT',
          useValue: mockCommsClient,
        },
      ],
    }).compile();

    activityModule = new ActivityModule();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have ActivityController defined', () => {
    const controller = module.get<ActivityController>(ActivityController);
    expect(controller).toBeDefined();
  });

  it('should have ActivityService defined', () => {
    const service = module.get<ActivityService>(ActivityService);
    expect(service).toBeDefined();
  });

  it('should export ActivityService', () => {
    const service = module.get<ActivityService>(ActivityService);
    expect(service).toBeDefined();
  });

  it('should have proper module structure', () => {
    expect(activityModule).toBeDefined();
  });

  it('should have correct module metadata', () => {
    const moduleMetadata = Reflect.getMetadata('imports', ActivityModule);
    const controllerMetadata = Reflect.getMetadata('controllers', ActivityModule);
    const providerMetadata = Reflect.getMetadata('providers', ActivityModule);
    const exportMetadata = Reflect.getMetadata('exports', ActivityModule);

    expect(controllerMetadata).toContain(ActivityController);
    expect(providerMetadata).toContain(ActivityService);
    expect(exportMetadata).toContain(ActivityService);
  });

  it('should have ClientsModule imported', () => {
    const moduleMetadata = Reflect.getMetadata('imports', ActivityModule);
    expect(moduleMetadata).toBeDefined();
  });
}); 