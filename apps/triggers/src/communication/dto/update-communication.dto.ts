import { PartialType } from '@nestjs/swagger';
import { CreateCommunicationDto } from './create-communication.dto';

export class UpdateCommunicationDto extends PartialType(
  CreateCommunicationDto,
) {}
