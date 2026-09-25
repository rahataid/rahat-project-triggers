import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CommunicationAudioDto {
  @ApiProperty({
    example: 'https://cdn.rahat.io/audio/flood-warning.mp3',
    description: 'The publicly reachable URL of the audio file',
  })
  @IsString()
  @IsNotEmpty()
  mediaURL: string;

  @ApiProperty({
    example: 'flood-warning.mp3',
    description: 'The original file name of the audio file',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;
}

export class CreateCommunicationDto {
  @ApiProperty({
    example: 'Flood warning broadcast',
    description: 'The title of the communication',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'a3b1c2d4-1111-2222-3333-444455556666',
    description:
      'Optional reference to an external record this communication relates to',
    required: false,
  })
  @IsString()
  @IsOptional()
  xrefId?: string;

  @ApiProperty({
    example: 'Water levels are rising, please move to higher ground.',
    description: 'The body of the communication',
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({
    example: 'Urgent: flood warning',
    description: 'The subject line, used by email transports',
    required: false,
  })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({
    description: 'The audio payload, used by voice transports',
    required: false,
    type: CommunicationAudioDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CommunicationAudioDto)
  audioURL?: CommunicationAudioDto;

  @ApiProperty({
    example: '5c3f1e2a-7b8c-4d9e-a0f1-2b3c4d5e6f70',
    description: 'The ID of the communication session',
    required: false,
  })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiProperty({
    example: '9f8e7d6c-5b4a-3210-fedc-ba9876543210',
    description: 'The ID of the transport used to deliver the communication',
    required: false,
  })
  @IsString()
  @IsOptional()
  transportId?: string;

  @ApiProperty({
    example: 'b1a2c3d4-5e6f-7081-92a3-b4c5d6e7f809',
    description: 'The ID of the group the communication is addressed to',
  })
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({
    example: 'BENEFICIARY',
    description: 'The kind of group the communication is addressed to',
  })
  @IsString()
  @IsNotEmpty()
  groupType: string;

  @ApiProperty({
    example: 'user-id',
    description: 'The ID of the user who created the communication',
    required: false,
  })
  @IsString()
  @IsOptional()
  createdBy?: string;
}
