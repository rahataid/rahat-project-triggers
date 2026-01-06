import { IsNumber } from 'class-validator';

export class GetOneTriggerHistoryDto {
  @IsNumber()
  id: number;
}
