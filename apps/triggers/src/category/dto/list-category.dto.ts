import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListCategoryDto {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Category name' })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '', description: ' app ID' })
  appId?: string;
}
