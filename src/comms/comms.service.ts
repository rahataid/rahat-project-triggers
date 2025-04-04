import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { getClient } from '@rumsan/connect/src/clients';

const GET_COMMUNICATION_SETTINGS = 'appJobs.communication.getSettings';

export type CommsClient = ReturnType<typeof getClient>;

@Injectable()
export class CommsService {
  private client: CommsClient;
  private logger = new Logger(CommsService.name);

  constructor(
    @Inject('CORE_CLIENT') private readonly coreClient: ClientProxy,
  ) {}

  async init() {
    const [communicationSettings] = await lastValueFrom(
      this.coreClient.send({ cmd: GET_COMMUNICATION_SETTINGS }, {}),
    );
    this.logger.log('Communication Settings:', communicationSettings);

    if (!communicationSettings) {
      this.logger.error('Communication Settings not found.');
      process.exit(1);
    }
    this.client = getClient({
      baseURL: communicationSettings.value['URL'],
    });
    this.client.setAppId(communicationSettings.value['APP_ID']);
  }

  async getClient(): Promise<any> {
    if (!this.client) {
      await this.init();
      return this.client;
    }
    return this.client;
  }
}
