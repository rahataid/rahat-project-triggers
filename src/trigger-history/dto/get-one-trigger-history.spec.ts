import { validate } from 'class-validator';
import { GetOneTriggerHistoryDto } from './get-one-trigger-history';

describe('GetOneTriggerHistoryDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = new GetOneTriggerHistoryDto();
      dto.id = 1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with zero id', async () => {
      const dto = new GetOneTriggerHistoryDto();
      dto.id = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with negative id', async () => {
      const dto = new GetOneTriggerHistoryDto();
      dto.id = -1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with large number id', async () => {
      const dto = new GetOneTriggerHistoryDto();
      dto.id = 999999;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when id is missing', async () => {
      const dto = new GetOneTriggerHistoryDto();

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should fail validation when id is not a number', async () => {
      const dto = new GetOneTriggerHistoryDto();
      (dto as any).id = 'not-a-number';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should fail validation when id is undefined', async () => {
      const dto = new GetOneTriggerHistoryDto();
      (dto as any).id = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should fail validation when id is null', async () => {
      const dto = new GetOneTriggerHistoryDto();
      (dto as any).id = null;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });
  });

  describe('class structure', () => {
    it('should be a class', () => {
      expect(typeof GetOneTriggerHistoryDto).toBe('function');
    });

    it('should be instantiable', () => {
      const dto = new GetOneTriggerHistoryDto();
      expect(dto).toBeInstanceOf(GetOneTriggerHistoryDto);
    });
  });

  describe('type safety', () => {
    it('should accept number type for id', () => {
      const dto = new GetOneTriggerHistoryDto();
      dto.id = 123;
      expect(typeof dto.id).toBe('number');
    });

    it('should handle different number values', () => {
      const dto = new GetOneTriggerHistoryDto();
      
      dto.id = 0;
      expect(dto.id).toBe(0);
      
      dto.id = 1;
      expect(dto.id).toBe(1);
      
      dto.id = -1;
      expect(dto.id).toBe(-1);
      
      dto.id = 999999;
      expect(dto.id).toBe(999999);
    });
  });
}); 