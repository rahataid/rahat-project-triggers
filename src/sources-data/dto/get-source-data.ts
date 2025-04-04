import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { DataSource } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto';

export class GetSouceDataDto extends PartialType(PaginationDto) {
  @ApiProperty({
    type: String,
  })
  @IsString()
  riverBasin: string;

  @ApiProperty({
    type: DataSource.DHM,
  })
  @IsEnum(DataSource)
  @IsString()
  source: DataSource;

  @ApiProperty({
    example: '2242424',
  })
  @IsString()
  appId: string;
}
