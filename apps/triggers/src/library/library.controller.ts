import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { LibraryService } from './library.service';
import { GetActivityTemplatesDto } from './dto';

@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.LIBRARY.GET_ACTIVITY_TEMPLATES,
  })
  async getActivityTemplates(@Payload() payload: GetActivityTemplatesDto) {
    return this.libraryService.getActivityTemplates(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.LIBRARY.GET_ACTIVITY_TEMPLATE_BY_ID,
  })
  async getActivityTemplateById(
    @Payload() payload: { uuid: string; appId?: string },
  ) {
    return this.libraryService.getActivityTemplateById(payload);
  }
}
