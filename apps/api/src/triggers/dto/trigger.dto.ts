import { IsString, IsJSON, IsOptional, IsBoolean } from 'class-validator';

export class TriggerDto {
  @IsString()
  repeatKey: string;

  @IsString()
  repeatEvery: string;

  @IsJSON()
  triggerStatement: any;

  @IsString()
  @IsOptional()
  triggerDocuments?: any;

  @IsString()
  notes: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsBoolean()
  isMandatory: boolean;

  @IsBoolean()
  isTriggered: boolean;

  @IsBoolean()
  isDeleted: boolean;
}
