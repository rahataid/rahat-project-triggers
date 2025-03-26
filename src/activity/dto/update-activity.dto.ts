import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateActivityDto } from './create-activity.dto';
import {
  IsNotEmpty,
  IsString,
} from 'class-validator/types/decorator/decorators';

export class UpdateActivityDto extends PartialType(CreateActivityDto) {
  @ApiProperty({
    example: 'responsibility',
    description: 'The responsibility associated with the activity',
  })
  @IsString()
  @IsNotEmpty()
  managerId: string;
}
