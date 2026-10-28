import { SettingsService } from '@lib/core';
import { Injectable } from '@nestjs/common';
import { lowerCaseObjectKeys } from './utils/utility';
import { getVersionFromPackageJson } from './utils/version.helper';

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

  // Returns the current app version and runtime environment.
  async getVersion(): Promise<{ version: string; env: string | null }> {
    const version = await getVersionFromPackageJson();
    return { version, env: process.env.NODE_ENV || null };
  }
}
