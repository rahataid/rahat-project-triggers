import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateTriggerCallbackDto } from './create-trigger-callback.dto';

export class UpdateTriggerCallbackDto extends PartialType(
  CreateTriggerCallbackDto,
) {
  @ApiProperty({ description: 'Callback UUID' })
  @IsString()
  @IsNotEmpty()
  uuid: string;
}

export class RemoveTriggerCallbackDto {
  @ApiProperty({ description: 'Callback UUID' })
  @IsString()
  @IsNotEmpty()
  uuid: string;
}

export class GetTriggerCallbacksDto {
  @ApiProperty({ description: 'Trigger UUID' })
  @IsString()
  @IsNotEmpty()
  triggerId: string;
}

export class GetTriggerCallbackDto {
  @ApiProperty({ description: 'Callback UUID' })
  @IsString()
  @IsNotEmpty()
  uuid: string;
}

export class GetTriggerCallbackLogsDto {
  @ApiProperty({ description: 'Callback UUID' })
  @IsString()
  @IsNotEmpty()
  callbackId: string;
}

export class ReplayTriggerCallbackDto {
  @ApiProperty({ description: 'Callback UUID' })
  @IsString()
  @IsNotEmpty()
  callbackUuid: string;
}
