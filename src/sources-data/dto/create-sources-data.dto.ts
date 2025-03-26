import { ApiProperty } from '@nestjs/swagger';
import { DataSource } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CreateSourcesDataDto {
  @ApiProperty({
    example: 'GROUNDWATER',
    description:
      'The source name or identifier (must match an existing DataSource enum value)',
    enum: DataSource,
  })
  @IsEnum(DataSource)
  @IsOptional()
  source?: DataSource;

  @ApiProperty({
    example: 'riverBasin',
    description: 'The river basin associated with the source',
  })
  @IsString()
  @IsOptional()
  riverBasin?: string;

  @ApiProperty({
    example: [{ key: 'value' }],
    description: 'The JSON data associated with the source',
  })
  @IsNotEmpty()
  info: object;
}
