import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

const optionalBooleanMapper = new Map([
  ['undefined', undefined],
  ['true', true],
  ['false', false],
]);

export class ListSettingDto {
  @ApiProperty({ example: 1 })
  @IsString()
  @IsOptional()
  sort!: string;

  @ApiProperty({ example: 'desc' })
  @IsString()
  @IsOptional()
  order!: 'asc' | 'desc';

  @ApiProperty({ example: 1 })
  @IsNumber()
  page!: number;

  @ApiProperty({ example: '10' })
  @IsNumber()
  perPage!: number;

  @ApiPropertyOptional({ example: 'Tayaba' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: false, type: 'boolean' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => optionalBooleanMapper.get(value))
  private?: string;

  @ApiPropertyOptional({ example: false, type: 'boolean' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => optionalBooleanMapper.get(value))
  readOnly?: string;
}
