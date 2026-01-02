import { Prisma, PrismaService } from '@lib/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { TriggerDto } from './dto/trigger.dto';
import { ActivateTriggerDto } from './dto/activate-trigger.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TriggersService {
  private readonly logger = new Logger(TriggersService.name);
  constructor(
    private readonly prismaService: PrismaService,
    @Inject('TRIGGERS_MICROSERVICE')
    private readonly triggersClient: ClientProxy,
  ) {}

  async findAll() {
    this.logger.log('Finding all triggers');
    return this.prismaService.trigger.findMany();
  }

  async findOne(id: number) {
    this.logger.log(`Finding trigger with id: ${id}`);
    return this.prismaService.trigger.findUnique({
      where: { id },
    });
  }

  async create(data: TriggerDto) {
    this.logger.log(
      'Forwarding trigger creation request to triggers microservice',
    );
    return firstValueFrom(
      this.triggersClient.send({ cmd: 'ms.jobs.triggers.add' }, data),
    );
  }

  async activate(data: ActivateTriggerDto) {
    this.logger.log(
      'Forwarding trigger activation request to triggers microservice',
    );
    return firstValueFrom(
      this.triggersClient.send({ cmd: 'ms.jobs.triggers.activate' }, data),
    );
  }

  async update(id: number, data: Prisma.TriggerUpdateInput) {
    this.logger.log(`Updating trigger with id: ${id}`, data);
    return this.prismaService.trigger.update({ where: { id }, data });
  }

  async delete(id: number) {
    this.logger.log(`Deleting trigger with id: ${id}`);
    return this.prismaService.trigger.delete({ where: { id } });
  }
}
