import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CreateSourcesDataDto {
  @ApiProperty({
    example: 'source-name',
    description: 'The source name or identifier',
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty({
    example: 'location-name',
    description: 'The location associated with the source',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    example: { key: 'value' },
    description: 'The JSON data associated with the source',
  })
  @IsNotEmpty()
  data: Record<string, any>;
}
