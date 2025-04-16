import { PaginationDto } from 'src/common/dto';
import { PartialType } from '@nestjs/mapped-types';

export class GetSouceDto extends PartialType(PaginationDto) {}
