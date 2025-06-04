import { PartialType } from '@nestjs/mapped-types';
import { CreatePhaseDto } from './create-phase.dto';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class UpdatePhaseDto extends PartialType(CreatePhaseDto) {
  @ApiProperty({
    example: '2025-03-24T09:18:45.858Z',
  })
  @IsString()
  @IsOptional()
  sourceId: string;
}

export class ConfigureThresholdPhaseDto {
  @ApiProperty({
    example: '2025-03-24T09:18:45.858Z',
    description: 'Phase id',
  })
  @IsString()
  uuid: string;

  @ApiProperty({
    example: '2025-03-24T09:18:45.858Z',
    description: 'Optional Trigger',
  })
  @IsNumber()
  requiredOptionalTriggers: number;

  @ApiProperty({
    example: '2025-03-24T09:18:45.858Z',
    description: 'Mandatory Trigger',
  })
  @IsNumber()
  requiredMandatoryTriggers: number;
}
