import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { DataSource, Phases } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto';

export class GetPhaseDto extends PartialType(PaginationDto) {
  @ApiProperty({
    example: 'Active year',
    description: 'A active year of the phase',
  })
  @IsString()
  @IsOptional()
  activeYear?: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @IsOptional()
  river_basin?: string;

  @ApiProperty({
    type: DataSource.DHM,
  })
  @IsEnum(DataSource)
  @IsOptional()
  @IsString()
  source?: DataSource;

  @ApiProperty({
    example: Phases.PREPAREDNESS,
  })
  @IsEnum(Phases)
  @IsNotEmpty()
  @IsOptional()
  name?: Phases;
}
