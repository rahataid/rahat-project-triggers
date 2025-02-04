import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePhaseDto {
  @ApiProperty({
    example: 'PREPAREDNESS',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

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
  @IsOptional()
  location?: string;
}
