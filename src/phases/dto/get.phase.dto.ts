import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto';

export class GetPhaseDto extends PartialType(PaginationDto) {
  @ApiProperty({
    example: 'unique-key',
    description: 'A unique key to identify the app Id',
  })
  @IsString()
  appId: string;
}
