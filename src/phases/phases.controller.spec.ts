import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@rumsan/prisma';
import { Queue } from 'bull';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { TriggerService } from 'src/trigger/trigger.service';
import { MS_TRIGGER_CLIENTS, BQUEUE } from 'src/constant';

describe('PhasesController', () => {
  let controller: PhasesController;

  const mockPrismaService = {
    phase: {
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
      findMany: jest.fn(),
      update: jest.fn(),
    },
    activity: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTriggerService = {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    getAll: jest.fn(),
    getOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activateTrigger: jest.fn(),
    archive: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockContractQueue = {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    removeJobs: jest.fn(),
  };

  const mockCommunicationQueue = {
    add: jest.fn(),
    process: jest.fn(),
    getJob: jest.fn(),
    removeJobs: jest.fn(),
  };

  const mockClientProxy = {
    send: jest.fn(),
    emit: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhasesController],
      providers: [
        PhasesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TriggerService,
          useValue: mockTriggerService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: 'BullQueue_CONTRACT',
          useValue: mockContractQueue,
        },
        {
          provide: 'BullQueue_COMMUNICATION',
          useValue: mockCommunicationQueue,
        },
        {
          provide: MS_TRIGGER_CLIENTS.RAHAT,
          useValue: mockClientProxy,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<PhasesController>(PhasesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
