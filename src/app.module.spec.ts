import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '@rumsan/prisma';

describe('AppModule', () => {
  let appModule: AppModule;

  beforeEach(async () => {
    appModule = new AppModule();
  });

  afterEach(async () => {
    // Clear any potential async operations
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterAll(async () => {
    // Ensure all async operations are cleaned up
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('should be defined', () => {
    expect(appModule).toBeDefined();
  });

  it('should have proper module structure', () => {
    expect(appModule).toBeDefined();
  });

  it('should have correct module metadata', () => {
    const controllerMetadata = Reflect.getMetadata('controllers', AppModule);
    const providerMetadata = Reflect.getMetadata('providers', AppModule);

    expect(controllerMetadata).toContain(AppController);
    expect(providerMetadata).toContain(AppService);
    expect(providerMetadata).toContain(PrismaService);
  });

  it('should have proper module imports', () => {
    const moduleMetadata = Reflect.getMetadata('imports', AppModule);
    expect(moduleMetadata).toBeDefined();
  });

  describe('Module Structure', () => {
    it('should be an instance of AppModule', () => {
      expect(appModule).toBeInstanceOf(AppModule);
    });

    it('should have AppController in metadata', () => {
      const controllerMetadata = Reflect.getMetadata('controllers', AppModule);
      expect(controllerMetadata).toContain(AppController);
    });

    it('should have AppService in metadata', () => {
      const providerMetadata = Reflect.getMetadata('providers', AppModule);
      expect(providerMetadata).toContain(AppService);
    });

    it('should have PrismaService in metadata', () => {
      const providerMetadata = Reflect.getMetadata('providers', AppModule);
      expect(providerMetadata).toContain(PrismaService);
    });
  });

  describe('Module Configuration', () => {
    it('should have imports defined', () => {
      const moduleMetadata = Reflect.getMetadata('imports', AppModule);
      expect(moduleMetadata).toBeDefined();
      expect(Array.isArray(moduleMetadata)).toBe(true);
    });

    it('should have controllers defined', () => {
      const controllerMetadata = Reflect.getMetadata('controllers', AppModule);
      expect(controllerMetadata).toBeDefined();
      expect(Array.isArray(controllerMetadata)).toBe(true);
    });

    it('should have providers defined', () => {
      const providerMetadata = Reflect.getMetadata('providers', AppModule);
      expect(providerMetadata).toBeDefined();
      expect(Array.isArray(providerMetadata)).toBe(true);
    });
  });

  describe('Module Class', () => {
    it('should be a class', () => {
      expect(typeof AppModule).toBe('function');
    });

    it('should be instantiable', () => {
      expect(() => new AppModule()).not.toThrow();
    });

    it('should have proper constructor', () => {
      const instance = new AppModule();
      expect(instance).toBeDefined();
    });
  });
});
