import { PartialType } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto';
import { ApiProperty } from '@nestjs/swagger';
import { DataSource } from '@lib/database';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class findOneTriggerDto {
  @ApiProperty({
    example: 'trigger-id',
    description: 'The UUID of the trigger to retrieve',
  })
  @IsString()
  @IsNotEmpty()
  uuid: string;
}

export class GetTriggersDto extends PartialType(PaginationDto) {
  @ApiProperty({
    example: 'user-id',
    description: 'The ID of the user who triggered the action',
  })
  @IsString()
  @IsOptional()
  phaseId?: string;

  @ApiProperty({
    example: 'user-id',
    description: 'The ID of the user who triggered the action',
  })
  @IsString()
  @IsOptional()
  appId?: string;

  @ApiProperty({
    example: DataSource.MANUAL,
    description: 'Data Source',
  })
  @IsOptional()
  @IsEnum(DataSource)
  source: DataSource;

  @ApiProperty({
    example: 'Karnali at Chisapani',
    description: 'The station of River Besin',
  })
  @IsString()
  @IsOptional()
  riverBasin?: string;

  @ApiProperty({
    example: '2024',
    description: 'The year of the project',
  })
  @IsString()
  @IsOptional()
  activeYear?: string;
}
