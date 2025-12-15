import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateTriggerDto } from './create-trigger.dto';
import { IsString } from 'class-validator';

export class UpdateTriggerPayloadDto extends PartialType(CreateTriggerDto) {
  @ApiProperty({
    description: 'Application ID',
  })
  @IsString()
  appId: string;
}

export class UpdateTriggerTransactionDto {
  @ApiProperty({
    description: 'Trigger UUID',
  })
  @IsString()
  uuid: string;

  @ApiProperty({
    description: 'Transaction Hash',
  })
  transactionHash: string;
}

export class RemoveTriggerPayloadDto {
  @ApiProperty({
    description: 'Trigger UUID',
  })
  @IsString()
  uuid: string;
}
