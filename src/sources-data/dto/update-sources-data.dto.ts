import { PartialType } from '@nestjs/swagger';
import { CreateSourcesDataDto } from './create-sources-data.dto';

export class UpdateSourcesDataDto extends PartialType(CreateSourcesDataDto) {}
