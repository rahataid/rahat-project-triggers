import { Controller, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from './constant';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @MessagePattern({ cmd: 'try.trigger' })
  getHello(): string {
    this.logger.log('Received command: try.trigger');
    const response = this.appService.getHello();
    return response;
  }

  // @Get()
  // test(): string {
  //   this.logger.log('Received command: try.trigger');
  //   const response = this.appService.getHello();
  //   return response;
  // }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.SETTINGS.GET,
  })
  getSettings(dto: { name: string }) {
    return this.appService.getSettings(dto);
  }
}
