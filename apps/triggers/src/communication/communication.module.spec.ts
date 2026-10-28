import { CommunicationController } from './communication.controller';
import { CommunicationModule } from './communication.module';
import { CommunicationService } from './communication.service';

describe('CommunicationModule', () => {
  let communicationModule: CommunicationModule;

  beforeEach(() => {
    communicationModule = new CommunicationModule();
  });

  it('should be defined', () => {
    expect(communicationModule).toBeDefined();
  });

  it('should have correct module metadata for controllers', () => {
    const controllerMetadata = Reflect.getMetadata(
      'controllers',
      CommunicationModule,
    );
    expect(controllerMetadata).toBeDefined();
    expect(Array.isArray(controllerMetadata)).toBe(true);
    expect(controllerMetadata).toContain(CommunicationController);
  });

  it('should have correct module metadata for providers', () => {
    const providerMetadata = Reflect.getMetadata(
      'providers',
      CommunicationModule,
    );
    expect(providerMetadata).toBeDefined();
    expect(Array.isArray(providerMetadata)).toBe(true);
    expect(providerMetadata).toContain(CommunicationService);
  });

  it('should have correct module metadata for exports', () => {
    const exportMetadata = Reflect.getMetadata('exports', CommunicationModule);
    expect(exportMetadata).toBeDefined();
    expect(Array.isArray(exportMetadata)).toBe(true);
    expect(exportMetadata).toContain(CommunicationService);
  });
});
