import { PartialType } from '@nestjs/mapped-types';
import { CreatePhaseDto } from './create-phase.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class UpdatePhaseDto extends PartialType(CreatePhaseDto) {
  @ApiProperty({
    example: '2025-03-24T09:18:45.858Z',
  })
  @IsString()
  @IsOptional()
  sourceId: string;
}
