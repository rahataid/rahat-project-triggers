import { validate } from 'class-validator';
import { GetSouceDataDto, SourceDataType } from './get-source-data';
import { DataSource } from '@prisma/client';

describe('GetSouceDataDto', () => {
  it('should be defined', () => {
    const dto = new GetSouceDataDto();
    expect(dto).toBeDefined();
  });

  it('should validate with valid data', async () => {
    const dto = new GetSouceDataDto();
    dto.riverBasin = 'Test Basin';
    dto.source = DataSource.DHM;
    dto.type = SourceDataType.Point;
    dto.appId = 'test-app-id';
    dto.from = new Date('2023-10-01T00:00:00.000Z');
    dto.to = new Date('2023-10-02T00:00:00.000Z');

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should validate with optional fields', async () => {
    const dto = new GetSouceDataDto();
    dto.riverBasin = 'Test Basin';
    dto.source = DataSource.DHM;
    dto.type = SourceDataType.Point;
    dto.appId = 'test-app-id';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with missing required fields', async () => {
    const dto = new GetSouceDataDto();
    // Missing required fields

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate SourceDataType enum', () => {
    expect(SourceDataType.Point).toBe('POINT');
    expect(SourceDataType.Hourly).toBe('HOURLY');
    expect(SourceDataType.Daily).toBe('DAILY');
  });
}); 