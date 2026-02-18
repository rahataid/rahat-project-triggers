import { Global, Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsUtilsService } from './settings.utils.service';

@Global()
@Module({
  controllers: [],
  providers: [SettingsService, SettingsUtilsService],
  exports: [SettingsService, SettingsUtilsService],
})
export class SettingsModule {}
