import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { SourceService } from './source.service';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { GetSouceDto } from './dto/get-source.dto';

@Controller('source')
export class SourceController {
  constructor(private readonly sourceService: SourceService) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.SOURCE.GET_ALL,
  })
  async getAllSource(dto: GetSouceDto): Promise<any> {
    return await this.sourceService.findAll(dto);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.SOURCE.GET_ONE,
  })
  async findOne(dto: any) {
    return await this.sourceService.findOne(dto);
  }
}
