import { LibraryModule } from './library.module';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';

describe('LibraryModule', () => {
  let libraryModule: LibraryModule;

  beforeEach(() => {
    libraryModule = new LibraryModule();
  });

  it('should be defined', () => {
    expect(libraryModule).toBeDefined();
  });

  it('should have correct module metadata for controllers', () => {
    const controllerMetadata = Reflect.getMetadata(
      'controllers',
      LibraryModule,
    );
    expect(controllerMetadata).toBeDefined();
    expect(Array.isArray(controllerMetadata)).toBe(true);
    expect(controllerMetadata).toContain(LibraryController);
  });

  it('should have correct module metadata for providers', () => {
    const providerMetadata = Reflect.getMetadata('providers', LibraryModule);
    expect(providerMetadata).toBeDefined();
    expect(Array.isArray(providerMetadata)).toBe(true);
    expect(providerMetadata).toContain(LibraryService);
  });

  it('should have correct module metadata for exports', () => {
    const exportMetadata = Reflect.getMetadata('exports', LibraryModule);
    expect(exportMetadata).toBeDefined();
    expect(Array.isArray(exportMetadata)).toBe(true);
    expect(exportMetadata).toContain(LibraryService);
  });
});
