import { ApiResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Controller, Param } from '@nestjs/common';
import { Get, Post, Patch, Delete, Body } from '@nestjs/common';
import { TriggersService } from './trigger.service';
import { Prisma } from '@lib/database';
import { TriggerDto } from './dto/trigger.dto';

@ApiTags('triggers')
@Controller('triggers')
export class TriggersController {
  constructor(private readonly triggersService: TriggersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all triggers' })
  @ApiResponse({ status: 200, description: 'Triggers retrieved successfully' })
  findAll() {
    return this.triggersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a trigger by ID' })
  @ApiResponse({ status: 200, description: 'Trigger retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  findOne(@Param('id') id: number) {
    return this.triggersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new trigger' })
  @ApiResponse({ status: 201, description: 'Trigger created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() data: TriggerDto) {
    return this.triggersService.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a trigger by ID' })
  @ApiResponse({ status: 200, description: 'Trigger updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  update(@Param('id') id: number, @Body() data: Prisma.TriggerUpdateInput) {
    return this.triggersService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a trigger by ID' })
  @ApiResponse({ status: 200, description: 'Trigger deleted successfully' })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  delete(@Param('id') id: number) {
    return this.triggersService.delete(id);
  }
}
