import { validate } from 'class-validator';
import { AddDailyMonitoringDto } from './add-daily-monitoring.dto';

describe('AddDailyMonitoringDto', () => {
  describe('Validation', () => {
    it('should validate with required properties', async () => {
      const dto = new AddDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      dto.data = [{ source: 'DHM', value: 100 }];
      dto.user = { name: 'Test User' };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with optional UUID', async () => {
      const dto = new AddDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      dto.data = [{ source: 'DHM', value: 100 }];
      dto.user = { name: 'Test User' };
      dto.uuid = 'test-uuid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation without riverBasin', async () => {
      const dto = new AddDailyMonitoringDto();
      dto.data = [{ source: 'DHM', value: 100 }];
      dto.user = { name: 'Test User' };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation without data', async () => {
      const dto = new AddDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      dto.user = { name: 'Test User' };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle complex data objects', async () => {
      const dto = new AddDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      dto.data = [
        { source: 'DHM', value: 100, additional: 'test' },
        { source: 'GLOFAS', value: 200, nested: { key: 'value' } },
      ];
      dto.user = { name: 'Test User', role: 'admin' };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle different data types in data array', async () => {
      const dto = new AddDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      dto.data = [
        { source: 'DHM', value: 100, number: 42, boolean: true },
        { source: 'GLOFAS', value: 200, string: 'test', null: null },
      ];
      dto.user = { name: 'Test User' };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle different user object structures', async () => {
      const dto = new AddDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      dto.data = [{ source: 'DHM', value: 100 }];
      dto.user = { name: 'Test User', id: 1, email: 'test@example.com' };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle null user', async () => {
      const dto = new AddDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      dto.data = [{ source: 'DHM', value: 100 }];
      dto.user = null;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle undefined user', async () => {
      const dto = new AddDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      dto.data = [{ source: 'DHM', value: 100 }];
      dto.user = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle different UUID formats', async () => {
      const dto = new AddDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      dto.data = [{ source: 'DHM', value: 100 }];
      dto.user = { name: 'Test User' };
      dto.uuid = '123e4567-e89b-12d3-a456-426614174000';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle empty string UUID', async () => {
      const dto = new AddDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      dto.data = [{ source: 'DHM', value: 100 }];
      dto.user = { name: 'Test User' };
      dto.uuid = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Property Access', () => {
    it('should have riverBasin property', () => {
      const dto = new AddDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      expect(dto.riverBasin).toBe('Test Basin');
    });

    it('should have data property', () => {
      const dto = new AddDailyMonitoringDto();
      dto.data = [{ source: 'DHM', value: 100 }];
      expect(dto.data).toEqual([{ source: 'DHM', value: 100 }]);
    });

    it('should have user property', () => {
      const dto = new AddDailyMonitoringDto();
      dto.user = { name: 'Test User' };
      expect(dto.user).toEqual({ name: 'Test User' });
    });

    it('should have optional uuid property', () => {
      const dto = new AddDailyMonitoringDto();
      dto.uuid = 'test-uuid';
      expect(dto.uuid).toBe('test-uuid');
    });
  });

  describe('Class Structure', () => {
    it('should be a class', () => {
      expect(typeof AddDailyMonitoringDto).toBe('function');
    });

    it('should be instantiable', () => {
      const dto = new AddDailyMonitoringDto();
      expect(dto).toBeInstanceOf(AddDailyMonitoringDto);
    });

    it('should have correct property types', () => {
      const dto = new AddDailyMonitoringDto();
      expect(typeof dto.riverBasin).toBe('undefined');
      expect(Array.isArray(dto.data)).toBe(false);
      expect(typeof dto.user).toBe('undefined');
      expect(typeof dto.uuid).toBe('undefined');
    });
  });
}); 