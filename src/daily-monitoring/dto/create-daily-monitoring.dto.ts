import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class CreateDailyMonitoringDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'The name of the person who entered the data',
  })
  @IsString()
  @IsNotEmpty()
  dataEntryBy: string;

  @ApiProperty({
    example: 'Sensor A',
    description: 'The source of the monitoring data',
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty({
    example: 'Warehouse 1',
    description: 'The location where the data was collected',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    example: { temperature: 22.5, humidity: 60 },
    description: 'The monitoring data in JSON format',
  })
  @IsNotEmpty()
  data: Record<any, any>;

  @ApiProperty({
    example: 'admin',
    description: 'The ID of the user who created the record',
  })
  @IsString()
  @IsOptional()
  createdBy?: string;

  @ApiProperty({
    example: false,
    description: 'Indicates if the record is marked as deleted',
  })
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}
