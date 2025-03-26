import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateActivityDto } from './create-activity.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateActivityDto extends PartialType(CreateActivityDto) {
  @ApiProperty({
    example: 'responsibility',
    description: 'The responsibility associated with the activity',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  managerId?: string;
}
