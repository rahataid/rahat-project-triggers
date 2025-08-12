import { validate } from 'class-validator';
import { StatDto } from './stat.dto';

describe('StatDto', () => {
  describe('Validation', () => {
    it('should pass validation with valid data', async () => {
      const statDto = new StatDto();
      statDto.name = 'TEST_STAT';
      statDto.data = { count: 10 };
      statDto.group = 'test_group';

      const errors = await validate(statDto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation without optional group', async () => {
      const statDto = new StatDto();
      statDto.name = 'TEST_STAT';
      statDto.data = { count: 10 };

      const errors = await validate(statDto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when name is empty', async () => {
      const statDto = new StatDto();
      statDto.name = '';
      statDto.data = { count: 10 };

      const errors = await validate(statDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail validation when name is not a string', async () => {
      const statDto = new StatDto();
      (statDto as any).name = 123;
      statDto.data = { count: 10 };

      const errors = await validate(statDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should fail validation when data is empty', async () => {
      const statDto = new StatDto();
      statDto.name = 'TEST_STAT';
      statDto.data = null;

      const errors = await validate(statDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNotEmpty).toBeDefined();
    });

    it('should fail validation when group is not a string', async () => {
      const statDto = new StatDto();
      statDto.name = 'TEST_STAT';
      statDto.data = { count: 10 };
      (statDto as any).group = 123;

      const errors = await validate(statDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });

    it('should pass validation with complex data object', async () => {
      const statDto = new StatDto();
      statDto.name = 'COMPLEX_STAT';
      statDto.data = {
        categories: [
          { id: 'FEMALE', count: 848 },
          { id: 'MALE', count: 1052 },
        ],
        total: 1900,
      };
      statDto.group = 'pie_chart';

      const errors = await validate(statDto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with empty string group', async () => {
      const statDto = new StatDto();
      statDto.name = 'TEST_STAT';
      statDto.data = { count: 10 };
      statDto.group = '';

      const errors = await validate(statDto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with whitespace-only name', async () => {
      const statDto = new StatDto();
      statDto.name = '   ';
      statDto.data = { count: 10 };

      const errors = await validate(statDto);
      expect(errors).toHaveLength(0); // @IsNotEmpty doesn't trim whitespace by default
    });
  });

  describe('Property Types', () => {
    it('should have correct property types', () => {
      const statDto = new StatDto();
      
      // Test name property
      statDto.name = 'TEST_STAT';
      expect(typeof statDto.name).toBe('string');
      
      // Test data property
      statDto.data = { count: 10 };
      expect(typeof statDto.data).toBe('object');
      
      // Test optional group property
      statDto.group = 'test_group';
      expect(typeof statDto.group).toBe('string');
    });

    it('should allow group to be undefined', () => {
      const statDto = new StatDto();
      statDto.name = 'TEST_STAT';
      statDto.data = { count: 10 };
      statDto.group = undefined;

      expect(statDto.group).toBeUndefined();
    });
  });

  describe('Object Instantiation', () => {
    it('should create instance with all properties', () => {
      const statDto = new StatDto();
      statDto.name = 'TEST_STAT';
      statDto.data = { count: 10 };
      statDto.group = 'test_group';

      expect(statDto).toBeInstanceOf(StatDto);
      expect(statDto.name).toBe('TEST_STAT');
      expect(statDto.data).toEqual({ count: 10 });
      expect(statDto.group).toBe('test_group');
    });

    it('should create instance without optional properties', () => {
      const statDto = new StatDto();
      statDto.name = 'TEST_STAT';
      statDto.data = { count: 10 };

      expect(statDto).toBeInstanceOf(StatDto);
      expect(statDto.name).toBe('TEST_STAT');
      expect(statDto.data).toEqual({ count: 10 });
      expect(statDto.group).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long name', async () => {
      const statDto = new StatDto();
      statDto.name = 'A'.repeat(1000);
      statDto.data = { count: 10 };

      const errors = await validate(statDto);
      expect(errors).toHaveLength(0);
    });

    it('should handle very long group', async () => {
      const statDto = new StatDto();
      statDto.name = 'TEST_STAT';
      statDto.data = { count: 10 };
      statDto.group = 'A'.repeat(1000);

      const errors = await validate(statDto);
      expect(errors).toHaveLength(0);
    });

    it('should handle complex nested data', async () => {
      const statDto = new StatDto();
      statDto.name = 'NESTED_STAT';
      statDto.data = {
        level1: {
          level2: {
            level3: {
              value: 'deep_nested_value',
              numbers: [1, 2, 3, 4, 5],
            },
          },
          array: ['item1', 'item2', 'item3'],
        },
        metadata: {
          created: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      const errors = await validate(statDto);
      expect(errors).toHaveLength(0);
    });

    it('should handle empty data object', async () => {
      const statDto = new StatDto();
      statDto.name = 'EMPTY_DATA_STAT';
      statDto.data = {};

      const errors = await validate(statDto);
      expect(errors).toHaveLength(0);
    });
  });
}); 