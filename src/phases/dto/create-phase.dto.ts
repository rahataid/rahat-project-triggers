import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
} from 'class-validator';
import { Phases, DataSource } from '@prisma/client';

export class CreatePhaseDto {
  @ApiProperty({
    example: Phases.PREPAREDNESS,
  })
  @IsEnum(Phases)
  @IsNotEmpty()
  name: Phases;

  @ApiProperty({
    example: '2025-03-24T09:18:45.858Z',
  })
  @IsString()
  @IsNotEmpty()
  @IsDateString()
  activeYear: string;

  @ApiProperty({
    example: 0,
  })
  @IsNumber()
  @IsOptional()
  requiredMandatoryTriggers?: number;

  @ApiProperty({
    example: 0,
  })
  @IsNumber()
  @IsOptional()
  requiredOptionalTriggers?: number;

  @ApiProperty({
    example: 0,
  })
  @IsNumber()
  @IsOptional()
  receivedMandatoryTriggers?: number;

  @ApiProperty({
    example: 0,
  })
  @IsNumber()
  @IsOptional()
  receivedOptionalTriggers?: number;

  @ApiProperty({
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  canRevert?: boolean;

  @ApiProperty({
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  canTriggerPayout?: boolean;

  @ApiProperty({
    type: String,
  })
  @IsString()
  river_basin: string;

  @ApiProperty({
    type: DataSource.DHM,
  })
  @IsEnum(DataSource)
  @IsString()
  source: DataSource;
}
