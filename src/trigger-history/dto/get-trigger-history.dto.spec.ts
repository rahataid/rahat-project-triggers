import { validate } from 'class-validator';
import { GetTriggerHistoryDto } from './get-trigger-history.dto';

describe('GetTriggerHistoryDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = new GetTriggerHistoryDto();
      dto.phaseUuid = 'phase-uuid-123';
      dto.version = '1';
      dto.phase = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with minimal required data', async () => {
      const dto = new GetTriggerHistoryDto();
      dto.phaseUuid = 'phase-uuid-123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when phaseUuid is missing', async () => {
      const dto = new GetTriggerHistoryDto();
      dto.version = '1';
      dto.phase = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation when phaseUuid is not a string', async () => {
      const dto = new GetTriggerHistoryDto();
      (dto as any).phaseUuid = 123;
      dto.version = '1';
      dto.phase = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should pass validation when version is optional string', async () => {
      const dto = new GetTriggerHistoryDto();
      dto.phaseUuid = 'phase-uuid-123';
      dto.version = '2';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation when phase is optional boolean', async () => {
      const dto = new GetTriggerHistoryDto();
      dto.phaseUuid = 'phase-uuid-123';
      dto.phase = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation when all optional fields are undefined', async () => {
      const dto = new GetTriggerHistoryDto();
      dto.phaseUuid = 'phase-uuid-123';
      dto.version = undefined;
      dto.phase = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('class structure', () => {
    it('should be a class', () => {
      expect(typeof GetTriggerHistoryDto).toBe('function');
    });

    it('should be instantiable', () => {
      const dto = new GetTriggerHistoryDto();
      expect(dto).toBeInstanceOf(GetTriggerHistoryDto);
    });
  });
}); 