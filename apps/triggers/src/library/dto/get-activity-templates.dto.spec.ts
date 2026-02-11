import { validate } from 'class-validator';
import { GetActivityTemplatesDto } from './get-activity-templates.dto';

describe('GetActivityTemplatesDto', () => {
  describe('validation', () => {
    it('should pass validation with all fields', async () => {
      const dto = new GetActivityTemplatesDto();
      dto.appId = 'app-123';
      dto.phase = 'Preparedness';
      dto.hasCommunication = true;
      dto.category = 'Early Warning';
      dto.title = 'Test';
      dto.isAutomated = 'true';
      dto.page = 1;
      dto.perPage = 10;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with no fields (all optional)', async () => {
      const dto = new GetActivityTemplatesDto();

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with only appId', async () => {
      const dto = new GetActivityTemplatesDto();
      dto.appId = 'app-123';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when appId is not a string', async () => {
      const dto = new GetActivityTemplatesDto();
      (dto as any).appId = 123;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation when phase is not a string', async () => {
      const dto = new GetActivityTemplatesDto();
      (dto as any).phase = 123;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should fail validation when hasCommunication is not a boolean', async () => {
      const dto = new GetActivityTemplatesDto();
      (dto as any).hasCommunication = 'not-boolean';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    });

    it('should fail validation when page is not a number', async () => {
      const dto = new GetActivityTemplatesDto();
      (dto as any).page = 'not-a-number';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should fail validation when perPage is not a number', async () => {
      const dto = new GetActivityTemplatesDto();
      (dto as any).perPage = 'not-a-number';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should pass with hasCommunication=false', async () => {
      const dto = new GetActivityTemplatesDto();
      dto.hasCommunication = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('class structure', () => {
    it('should be instantiable', () => {
      const dto = new GetActivityTemplatesDto();
      expect(dto).toBeDefined();
      expect(dto).toBeInstanceOf(GetActivityTemplatesDto);
    });
  });
});
