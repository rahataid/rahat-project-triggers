import { ApiProperty } from '@nestjs/swagger';
import { ActivityStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class ActivityManagerDto {
  @ApiProperty({
    example: 'user-id',
    description: 'The ID of the user who is responsibile the activity',
  })
  @IsString()
  id?: string;

  @ApiProperty({
    example: 'Name of manager',
    description: 'The name of the user who is responsible for the activity',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'example@gmail.com',
    description: 'The email of the user who is responsible for the activity',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '9812345678',
    description:
      'The contact number of the user who is responsible for the activity',
  })
  @IsString()
  phone: string;
}

export class CreateActivityDto {
  @ApiProperty({
    example: 'abc123-defg-uus45-ggkl1',
    description: 'activity uuid',
  })
  @IsOptional()
  @IsString()
  uuid?: string;

  @ApiProperty({
    example: 'Activity title',
    description: 'The title of the activity',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: '2023-01-01',
    description: 'The lead time for the activity in YYYY-MM-DD format',
  })
  @IsString()
  @IsNotEmpty()
  leadTime: string;

  @ApiProperty({
    example: 'responsibility',
    description: 'The responsibility associated with the activity',
  })
  @IsString()
  @IsNotEmpty()
  responsibility: string;

  @ApiProperty({
    example: '32813a9e-fb6a-450a-b811-b0f4280e0f2b',
    description: 'The ID of the related phase',
  })
  @IsString()
  @IsNotEmpty()
  phaseId: string;

  @ApiProperty({
    example: 'b3b3a9e-fb6a-450a-b811-b0f4280e0f2b',
    description: 'The ID of the related category',
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    example: 'description',
    description: 'The description of the activity',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'notes',
    description: 'Additional notes about the activity',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    example: 'NOT_STARTED',
    description: 'The status of the activity',
  })
  @IsEnum(ActivityStatus)
  @IsOptional()
  status?: ActivityStatus;

  @ApiProperty({
    example: { key: 'value' },
    description: 'Documents related to the activity',
  })
  @IsOptional()
  activityDocuments?: Record<string, any>;

  @ApiProperty({
    example: { key: 'value' },
    description: 'Communications related to the activity',
  })
  @IsOptional()
  activityCommunication?: Record<string, any>;

  @ApiProperty({
    example: { key: 'value' },
    description: 'Payout information for the activity',
  })
  @IsOptional()
  activityPayout?: Record<string, any>;

  @ApiProperty({
    example: false,
    description: 'Indicates if the activity is automated',
  })
  @IsBoolean()
  @IsOptional()
  isAutomated?: boolean = false;

  @ApiProperty({
    example: false,
    description: 'Indicates if the activity is deleted',
  })
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean = false;

  @ApiProperty({
    example: 'user-id',
    description: 'The ID of the user who completed the activity',
  })
  @IsString()
  @IsOptional()
  completedBy?: string;

  @ApiProperty({
    example: '2023-01-02',
    description: 'The date and time when the activity was completed',
  })
  @Type(() => Date)
  @IsOptional()
  completedAt?: Date;

  @ApiProperty({
    example: '2 days',
    description: 'The difference between trigger and activity completion time',
  })
  @IsString()
  @IsOptional()
  differenceInTriggerAndActivityCompletion?: string;

  @ApiProperty({
    example: '',
    description: 'app id',
  })
  @IsString()
  appId: string;

  // Manager Dto
  @ApiProperty({
    description: 'The manager responsible for the activity (optional)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.manager !== null)
  @ValidateNested()
  @Type(() => ActivityManagerDto)
  manager?: ActivityManagerDto | null;
}
