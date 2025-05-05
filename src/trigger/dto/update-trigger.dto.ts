import { PartialType } from '@nestjs/swagger';
import { CreateTriggerDto } from './create-trigger.dto';

export class UpdateTriggerDto extends PartialType(CreateTriggerDto) {}

export class UpdateTriggerTransactionDto {
  uuid: string;
  transactionHash: string;
}
