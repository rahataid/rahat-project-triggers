import { UpdateSourceDto } from './update-source.dto';
import { CreateSourceDto } from './create-source.dto';

describe('UpdateSourceDto', () => {
  it('should be defined', () => {
    expect(UpdateSourceDto).toBeDefined();
  });

  it('should be instantiable', () => {
    const dto = new UpdateSourceDto();
    expect(dto).toBeInstanceOf(UpdateSourceDto);
  });

  it('should extend PartialType of CreateSourceDto', () => {
    const dto = new UpdateSourceDto();
    expect(dto).toBeInstanceOf(UpdateSourceDto);
  });

  it('should have id property', () => {
    const dto = new UpdateSourceDto();
    expect(dto).toBeDefined();
    expect(typeof dto).toBe('object');
  });

  it('should allow setting id property', () => {
    const dto = new UpdateSourceDto();
    dto.id = 1;
    
    expect(dto.id).toBe(1);
  });

  it('should handle different id values', () => {
    const dto = new UpdateSourceDto();
    
    dto.id = 0;
    expect(dto.id).toBe(0);
    
    dto.id = 100;
    expect(dto.id).toBe(100);
    
    dto.id = -1;
    expect(dto.id).toBe(-1);
  });

  it('should handle null id', () => {
    const dto = new UpdateSourceDto();
    dto.id = null as any;
    
    expect(dto.id).toBeNull();
  });

  it('should handle undefined id', () => {
    const dto = new UpdateSourceDto();
    dto.id = undefined as any;
    
    expect(dto.id).toBeUndefined();
  });

  it('should allow adding properties dynamically', () => {
    const dto = new UpdateSourceDto();
    
    // Should not throw when adding properties
    (dto as any).testProperty = 'test';
    expect((dto as any).testProperty).toBe('test');
  });

  it('should handle multiple instances', () => {
    const dto1 = new UpdateSourceDto();
    const dto2 = new UpdateSourceDto();
    
    dto1.id = 1;
    dto2.id = 2;
    
    expect(dto1).not.toBe(dto2);
    expect(dto1.id).toBe(1);
    expect(dto2.id).toBe(2);
  });

  it('should be extensible', () => {
    const dto = new UpdateSourceDto();
    
    // Should allow extending with new properties
    (dto as any).newProperty = 'value';
    expect((dto as any).newProperty).toBe('value');
  });

  describe('Inheritance', () => {
    it('should inherit from CreateSourceDto', () => {
      const dto = new UpdateSourceDto();
      expect(dto).toBeDefined();
    });

    it('should work with PartialType', () => {
      // This test ensures the DTO can be used with PartialType
      const dto = new UpdateSourceDto();
      expect(dto).toBeDefined();
    });
  });

  describe('Class Structure', () => {
    it('should have correct class name', () => {
      expect(UpdateSourceDto.name).toBe('UpdateSourceDto');
    });

    it('should be a class', () => {
      expect(typeof UpdateSourceDto).toBe('function');
    });

    it('should be a constructor function', () => {
      expect(UpdateSourceDto.prototype).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for id property', () => {
      const dto = new UpdateSourceDto();
      
      // Should accept number
      dto.id = 1;
      expect(typeof dto.id).toBe('number');
      
      // Should accept null
      dto.id = null as any;
      expect(dto.id).toBeNull();
      
      // Should accept undefined
      dto.id = undefined as any;
      expect(dto.id).toBeUndefined();
    });

    it('should maintain type safety for inherited properties', () => {
      const dto = new UpdateSourceDto();
      
      // Should be able to add properties from CreateSourceDto
      (dto as any).createProperty = 'value';
      expect((dto as any).createProperty).toBe('value');
    });
  });

  describe('Usage in NestJS', () => {
    it('should be compatible with NestJS validation', () => {
      const dto = new UpdateSourceDto();
      dto.id = 1;
      
      // Should be a valid DTO for NestJS
      expect(dto).toBeDefined();
      expect(dto.id).toBe(1);
    });

    it('should be compatible with class-transformer', () => {
      const dto = new UpdateSourceDto();
      dto.id = 1;
      
      // Should be compatible with class-transformer
      expect(dto).toBeDefined();
      expect(dto.id).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large id values', () => {
      const dto = new UpdateSourceDto();
      dto.id = Number.MAX_SAFE_INTEGER;
      
      expect(dto.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle very small id values', () => {
      const dto = new UpdateSourceDto();
      dto.id = Number.MIN_SAFE_INTEGER;
      
      expect(dto.id).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('should handle floating point id values', () => {
      const dto = new UpdateSourceDto();
      dto.id = 1.5 as any;
      
      expect(dto.id).toBe(1.5);
    });
  });
}); 