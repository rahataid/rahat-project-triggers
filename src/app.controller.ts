import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern({
    cmd: 'test.trigger',
    uuid: 'a83e3867-de4b-4c20-b955-3d84875bc423',
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
