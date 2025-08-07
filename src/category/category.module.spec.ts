import { Test, TestingModule } from '@nestjs/testing';
import { CategoryModule } from './category.module';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

describe('CategoryModule', () => {
  let categoryModule: CategoryModule;

  beforeEach(async () => {
    categoryModule = new CategoryModule();
  });

  it('should be defined', () => {
    expect(categoryModule).toBeDefined();
  });

  it('should have proper module structure', () => {
    expect(categoryModule).toBeDefined();
  });

  it('should have correct module metadata', () => {
    const controllerMetadata = Reflect.getMetadata('controllers', CategoryModule);
    const providerMetadata = Reflect.getMetadata('providers', CategoryModule);

    expect(controllerMetadata).toContain(CategoryController);
    expect(providerMetadata).toContain(CategoryService);
  });
}); 