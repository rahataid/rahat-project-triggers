import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateSettingDto {
  @ApiProperty({
    example: 'SMTP',
    description: 'Name of the setting',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    example: {
      host: 'smtp.gmail.com',
      Port: 465,
      secure: true,
      username: 'test',
      password: 'test',
    },
    description: 'Settings value. Can be string | number | boolean | object',
    required: true,
  })
  @IsNotEmpty()
  value!: string | number | boolean | object;

  @ApiProperty({
    example: ['host', 'port', 'secure', 'username', 'PASSWORD'],
    description: 'Settings value. Can be string | number | boolean | object',
    required: true,
  })
  @IsOptional()
  @IsArray()
  requiredFields?: string[];

  @ApiProperty({
    example: false,
    description: 'If true, setting value cannot be changed',
  })
  @IsOptional()
  @IsBoolean()
  isReadOnly?: boolean;

  @ApiProperty({
    example: true,
    description: 'If true, setting value is not returned in public API',
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class UpdateSettingDto extends PickType(CreateSettingDto, ['value']) {}

// Sample 1
// {
//     name: 'APP_NAME',
//     value: 'Sample App',
//     isReadOnly: false,
//     isPrivate: false,
// }
// Sample 2
// {
//     name: 'SMTP',
//     value: {
//         host: 'smtp.gmail.com',
//         port: 465,
//         secure: true,
//         username: 'test',
//         password: 'test',
//     }
//     isReadOnly: false,
//     isPrivate: true,
// }
// Sample 3
// {
//     name: 'jwt_expiry',
//     value: 3600,
//     isReadOnly: false,
//     isPrivate: false,
// }
