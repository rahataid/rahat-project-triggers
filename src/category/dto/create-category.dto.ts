import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Category name' })
  name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '', description: ' app ID' })
  appId?: string;
}
