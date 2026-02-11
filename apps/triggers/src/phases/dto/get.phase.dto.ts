import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { Phases } from '@lib/database';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
    example: Phases.PREPAREDNESS,
  })
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  name?: string;
}

export class GetPhaseByDetailDto {
  @ApiProperty({
    example: Phases.PREPAREDNESS,
  })
  @IsString()
  @IsOptional()
  phase?: string;

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
  @IsOptional()
  @IsString()
  appId?: string;
}

export class GetPhaseByLocationDto {
  @ApiProperty({
    example: 'sfs-sfs-sfs-sfs-sfs',
  })
  @IsString()
  @IsNotEmpty()
  riverBasin: string;

  @ApiProperty({
    example: 'Jhapa',
  })
  @IsString()
  @IsNotEmpty()
  activeYear: string;
}

export class RevertPhaseDto {
  @ApiProperty({
    example: 'sfs-sfs-sfs-sfs-sfs',
  })
  @IsString()
  @IsNotEmpty()
  appId: string;

  @ApiProperty({
    example: 'sfs-sfs-sfs-sfs-sfs',
  })
  @IsString()
  @IsNotEmpty()
  phaseId: string;
}
