import { validate } from 'class-validator';
import { GaugeForecastDto } from './list-gaugeForecast.dto';

describe('GaugeForecastDto', () => {
  describe('Validation', () => {
    it('should validate with all properties', async () => {
      const dto = new GaugeForecastDto();
      dto.sourceId = '1';
      dto.station = 'Station A';
      dto.gaugeForecast = 'High';
      dto.date = '2023-01-01';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with partial properties', async () => {
      const dto = new GaugeForecastDto();
      dto.sourceId = '1';
      dto.station = 'Station A';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with no properties', async () => {
      const dto = new GaugeForecastDto();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle different data types', async () => {
      const dto = new GaugeForecastDto();
      dto.sourceId = '123';
      dto.station = 'Station B';
      dto.gaugeForecast = 'Medium';
      dto.date = '2023-01-01T00:00:00Z';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Property Access', () => {
    it('should have sourceId property', () => {
      const dto = new GaugeForecastDto();
      dto.sourceId = '1';
      expect(dto.sourceId).toBe('1');
    });

    it('should have station property', () => {
      const dto = new GaugeForecastDto();
      dto.station = 'Station A';
      expect(dto.station).toBe('Station A');
    });

    it('should have gaugeForecast property', () => {
      const dto = new GaugeForecastDto();
      dto.gaugeForecast = 'High';
      expect(dto.gaugeForecast).toBe('High');
    });

    it('should have date property', () => {
      const dto = new GaugeForecastDto();
      dto.date = '2023-01-01';
      expect(dto.date).toBe('2023-01-01');
    });
  });

  describe('Class Structure', () => {
    it('should be a class', () => {
      expect(typeof GaugeForecastDto).toBe('function');
    });

    it('should be instantiable', () => {
      const dto = new GaugeForecastDto();
      expect(dto).toBeInstanceOf(GaugeForecastDto);
    });

    it('should have correct property types', () => {
      const dto = new GaugeForecastDto();
      expect(typeof dto.sourceId).toBe('undefined');
      expect(typeof dto.station).toBe('undefined');
      expect(typeof dto.gaugeForecast).toBe('undefined');
      expect(typeof dto.date).toBe('undefined');
    });
  });
}); 