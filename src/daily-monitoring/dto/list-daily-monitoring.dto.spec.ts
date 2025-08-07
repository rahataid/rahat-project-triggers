import { validate } from 'class-validator';
import { ListDailyMonitoringDto } from './list-daily-monitoring.dto';

describe('ListDailyMonitoringDto', () => {
  describe('Validation', () => {
    it('should validate with all properties', async () => {
      const dto = new ListDailyMonitoringDto();
      dto.appId = 'test-app';
      dto.dataEntryBy = 'Test User';
      dto.riverBasin = 'Test Basin';
      dto.createdAt = '2023-01-01';
      dto.page = 1;
      dto.perPage = 10;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with partial properties', async () => {
      const dto = new ListDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      dto.page = 1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with no properties', async () => {
      const dto = new ListDailyMonitoringDto();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle different data types', async () => {
      const dto = new ListDailyMonitoringDto();
      dto.appId = 'test-app';
      dto.dataEntryBy = 'Test User';
      dto.riverBasin = 'Test Basin';
      dto.createdAt = '2023-01-01T00:00:00Z';
      dto.page = 1;
      dto.perPage = 20;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Property Access', () => {
    it('should have appId property', () => {
      const dto = new ListDailyMonitoringDto();
      dto.appId = 'test-app';
      expect(dto.appId).toBe('test-app');
    });

    it('should have dataEntryBy property', () => {
      const dto = new ListDailyMonitoringDto();
      dto.dataEntryBy = 'Test User';
      expect(dto.dataEntryBy).toBe('Test User');
    });

    it('should have riverBasin property', () => {
      const dto = new ListDailyMonitoringDto();
      dto.riverBasin = 'Test Basin';
      expect(dto.riverBasin).toBe('Test Basin');
    });

    it('should have createdAt property', () => {
      const dto = new ListDailyMonitoringDto();
      dto.createdAt = '2023-01-01';
      expect(dto.createdAt).toBe('2023-01-01');
    });

    it('should have page property', () => {
      const dto = new ListDailyMonitoringDto();
      dto.page = 1;
      expect(dto.page).toBe(1);
    });

    it('should have perPage property', () => {
      const dto = new ListDailyMonitoringDto();
      dto.perPage = 10;
      expect(dto.perPage).toBe(10);
    });
  });

  describe('Class Structure', () => {
    it('should be a class', () => {
      expect(typeof ListDailyMonitoringDto).toBe('function');
    });

    it('should be instantiable', () => {
      const dto = new ListDailyMonitoringDto();
      expect(dto).toBeInstanceOf(ListDailyMonitoringDto);
    });

    it('should extend PaginationDto', () => {
      const dto = new ListDailyMonitoringDto();
      expect(dto).toBeDefined();
    });
  });
}); 