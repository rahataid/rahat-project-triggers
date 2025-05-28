import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class GetTriggerHistoryDto {
  @IsString()
  phaseUuid: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsBoolean()
  phase?: boolean;
}
