import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) { }

  @MessagePattern({
    cmd: 'try.trigger',
  })
  getHello(): string {
    this.logger.log('Received command: try.trigger');
    const response = this.appService.getHello();
    return response;
  }
}
