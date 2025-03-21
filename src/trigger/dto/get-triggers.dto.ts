import { PartialType } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto';

export class GetTriggersDto extends PartialType(PaginationDto) {
  phaseId: string;

  appId?: string;
}
