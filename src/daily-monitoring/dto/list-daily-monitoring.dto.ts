import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PaginationDto } from 'src/common/dto';

export class ListDailyMonitoringDto extends PartialType(PaginationDto) {
  @ApiProperty()
  @IsOptional()
  appId?: string;

  @ApiProperty()
  @IsOptional()
  dataEntryBy?: string;

  @ApiProperty()
  @IsOptional()
  location?: string;

  @ApiProperty()
  @IsOptional()
  createdAt?: string;
}
