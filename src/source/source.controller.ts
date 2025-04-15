import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SourceService } from './source.service';

@Controller()
export class SourceController {
  constructor(private readonly sourceService: SourceService) {}

  @MessagePattern('findAllSource')
  findAll() {
    return this.sourceService.findAll();
  }

  @MessagePattern('findOneSource')
  findOne(@Payload() id: number) {
    return this.sourceService.findOne(id);
  }

}
