import { CommunicationGroupType } from '@lib/database';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class GetCommunicationDto {
  @ApiProperty({
    example: 'flood',
    description: 'Case insensitive partial match on the title',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'a3b1c2d4-1111-2222-3333-444455556666',
    description: 'Filter by the external reference ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  xrefId?: string;

  @ApiProperty({
    example: 'b1a2c3d4-5e6f-7081-92a3-b4c5d6e7f809',
    description: 'Filter by the addressed group',
    required: false,
  })
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiProperty({
    example: 'BENEFICIARY',
    enum: CommunicationGroupType,
    description: 'Filter by the kind of addressed group',
    required: false,
  })
  @IsEnum(CommunicationGroupType)
  @IsOptional()
  groupType?: CommunicationGroupType;

  @ApiProperty({
    example: '9f8e7d6c-5b4a-3210-fedc-ba9876543210',
    description: 'Filter by transport',
    required: false,
  })
  @IsString()
  @IsOptional()
  transportId?: string;

  @ApiProperty({
    example: '5c3f1e2a-7b8c-4d9e-a0f1-2b3c4d5e6f70',
    description: 'Filter by session',
    required: false,
  })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiProperty({
    example: 1,
    description: 'page number',
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    example: 10,
    description: 'number of items per page',
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  perPage?: number = 10;

  @ApiProperty({
    example: 'createdAt',
    description: 'Sort field',
    required: false,
  })
  @IsString()
  @IsOptional()
  sort?: string = 'createdAt';

  @ApiProperty({
    example: 'desc',
    description: 'Sort order',
    required: false,
  })
  @IsString()
  @IsIn(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';
}
