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
  riverBasin?: string;

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

export class GetPhaseByName {
  @ApiProperty({
    example: Phases.PREPAREDNESS,
  })
  @IsEnum(Phases)
  @IsNotEmpty()
  phase?: Phases;

  @ApiProperty({
    example: 'Karnali',
  })
  @IsString()
  uuid?: string;

  @ApiProperty({
    example: 'karnali',
  })
  @IsString()
  @IsOptional()
  riverBasin?: string;

  @ApiProperty({
    example: '2025',
  })
  @IsString()
  @IsOptional()
  activeYear?: string;

  @ApiProperty({
    example: 'sfs-sfs-sfs-sfs-sfs',
  })
  @IsString()
  appId?: string;
}
