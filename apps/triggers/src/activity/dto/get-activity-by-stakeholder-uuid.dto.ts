import { IsString } from 'class-validator';

export class GetActivityByStakeholderUuidDto {
  @IsString()
  stakeholderGroupUuid: string;
}
