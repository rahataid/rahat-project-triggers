import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class GetActivityTemplatesDto {
  @ApiProperty({
    example: 'app-uuid',
    description: 'The application ID',
  })
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiProperty({
    example: 'Preparedness',
    description: 'Filter templates by phase name',
  })
  @IsOptional()
  @IsString()
  phase?: string;

  @ApiProperty({
    example: true,
    description: 'Filter templates that have communication configured',
  })
  @IsOptional()
  @IsBoolean()
  hasCommunication?: boolean;

  @ApiProperty({
    example: 'Early Warning',
    description: 'Filter templates by category name',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    example: 'Send outlook',
    description: 'Search templates by title',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'true',
    description: 'Filter automated templates',
  })
  @IsOptional()
  @IsString()
  isAutomated?: string;

  @ApiProperty({
    example: 1,
    description: 'Page number for pagination',
  })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
  })
  @IsOptional()
  @IsNumber()
  perPage?: number;
}
