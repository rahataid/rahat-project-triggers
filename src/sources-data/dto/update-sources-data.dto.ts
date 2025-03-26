import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateSourcesDataDto } from './create-sources-data.dto';
import { IsNumber } from 'class-validator';

export class UpdateSourcesDataDto extends PartialType(CreateSourcesDataDto) {
  @ApiProperty({
    example: '1',
    description: 'A unique id to identify the source data',
  })
  @IsNumber()
  id: number;
}
