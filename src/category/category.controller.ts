import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MS_TRIGGERS_JOBS } from 'src/constant';
import { CategoryService } from './category.service';
import { ListCategoryDto } from './dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Post()
  // create(@AppId() appId: string, @Body() dto: CreateCategoryDto) {
  //   return this.categoryService.create(appId, dto);
  // }

  // @ApiHeader({
  //   name: 'app-id',
  //   description: 'Application ID',
  //   required: true,
  // })
  // @Get()
  // findAll(@AppId() appId: string, @Query() dto: PaginationDto): any {
  //   return this.categoryService.findAll(appId, dto);
  // }

  // @Get(':uuid')
  // findOne(@Param('uuid') uuid: string) {
  //   return this.categoryService.findOne(uuid);
  // }

  // @Patch(':uuid')
  // update(@Param('uuid') uuid: string, @Body() dto: UpdateCategoryDto) {
  //   return this.categoryService.update(uuid, dto);
  // }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.CATEGORIES.ADD,
    uuid: process.env.PROJECT_ID,
  })
  async add(payload: CreateCategoryDto) {
    const { appId, ...rest } = payload;
    return this.categoryService.create(appId, rest);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.CATEGORIES.GET_ALL,
    uuid: process.env.PROJECT_ID,
  })
  async getAll(payload: ListCategoryDto): Promise<any> {
    return this.categoryService.findAll(payload);
  }

  @MessagePattern({
    cmd: MS_TRIGGERS_JOBS.CATEGORIES.REMOVE,
    uuid: process.env.PROJECT_ID,
  })
  async remove(payload: { uuid: string }) {
    return this.categoryService.remove(payload);
  }
}
