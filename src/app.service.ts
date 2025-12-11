import { Injectable } from '@nestjs/common';
import { SettingsService } from '@rumsan/settings';
import { lowerCaseObjectKeys } from './utils/utility';

@Injectable()
export class AppService {
  constructor(private readonly settingService: SettingsService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getSettings(dto: { name: string }) {
    const { name } = dto;
    const res = await this.settingService.getPublic(name);

    return lowerCaseObjectKeys(res);
  }
}
