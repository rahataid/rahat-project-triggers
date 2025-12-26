import { SourcesDataModule } from './sources-data.module';
import { SourcesDataController } from './sources-data.controller';
import { SourcesDataService } from './sources-data.service';
import { ScheduleSourcesDataService } from './schedule-sources-data.service';
import { DataSourceEventsListener } from './data-source-events.listener';
import { GfhService } from '@lib/gfh-adapter';

describe('SourcesDataModule', () => {
  let sourcesDataModule: SourcesDataModule;

  beforeEach(() => {
    sourcesDataModule = new SourcesDataModule();
  });

  it('should be defined', () => {
    expect(sourcesDataModule).toBeDefined();
  });

  it('should have proper module structure', () => {
    expect(sourcesDataModule).toBeDefined();
  });

  it('should have correct module metadata for controllers', () => {
    const controllerMetadata = Reflect.getMetadata(
      'controllers',
      SourcesDataModule,
    );
    expect(controllerMetadata).toBeDefined();
    expect(Array.isArray(controllerMetadata)).toBe(true);
    expect(controllerMetadata).toContain(SourcesDataController);
  });

  it('should have correct module metadata for providers', () => {
    const providerMetadata = Reflect.getMetadata(
      'providers',
      SourcesDataModule,
    );
    expect(providerMetadata).toBeDefined();
    expect(Array.isArray(providerMetadata)).toBe(true);
    expect(providerMetadata).toContain(SourcesDataService);
    expect(providerMetadata).toContain(ScheduleSourcesDataService);
    expect(providerMetadata).toContain(DataSourceEventsListener);
  });

  it('should have correct module metadata for exports', () => {
    const exportMetadata = Reflect.getMetadata('exports', SourcesDataModule);
    expect(exportMetadata).toBeDefined();
    expect(Array.isArray(exportMetadata)).toBe(true);
    expect(exportMetadata).toContain(SourcesDataService);
    expect(exportMetadata).toContain(ScheduleSourcesDataService);
    expect(exportMetadata).toContain(GfhService);
  });

  it('should have correct module metadata for imports', () => {
    const importMetadata = Reflect.getMetadata('imports', SourcesDataModule);
    expect(importMetadata).toBeDefined();
    expect(Array.isArray(importMetadata)).toBe(true);
  });
});
