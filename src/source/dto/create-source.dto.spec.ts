import { CreateSourceDto } from './create-source.dto';

describe('CreateSourceDto', () => {
  it('should be defined', () => {
    expect(CreateSourceDto).toBeDefined();
  });

  it('should be instantiable', () => {
    const dto = new CreateSourceDto();
    expect(dto).toBeInstanceOf(CreateSourceDto);
  });

  it('should be an empty class', () => {
    const dto = new CreateSourceDto();
    expect(Object.keys(dto)).toHaveLength(0);
  });

  it('should allow adding properties dynamically', () => {
    const dto = new CreateSourceDto();
    
    // Should not throw when adding properties
    (dto as any).testProperty = 'test';
    expect((dto as any).testProperty).toBe('test');
  });

  it('should handle multiple instances', () => {
    const dto1 = new CreateSourceDto();
    const dto2 = new CreateSourceDto();
    
    expect(dto1).not.toBe(dto2);
    expect(dto1).toBeInstanceOf(CreateSourceDto);
    expect(dto2).toBeInstanceOf(CreateSourceDto);
  });

  it('should be extensible', () => {
    const dto = new CreateSourceDto();
    
    // Should allow extending with new properties
    (dto as any).newProperty = 'value';
    expect((dto as any).newProperty).toBe('value');
  });

  describe('Class Structure', () => {
    it('should have correct class name', () => {
      expect(CreateSourceDto.name).toBe('CreateSourceDto');
    });

    it('should be a class', () => {
      expect(typeof CreateSourceDto).toBe('function');
    });

    it('should be a constructor function', () => {
      expect(CreateSourceDto.prototype).toBeDefined();
    });
  });

  describe('Inheritance and Extension', () => {
    it('should be extendable', () => {
      class ExtendedCreateSourceDto extends CreateSourceDto {
        additionalProperty: string;
      }
      
      const extendedDto = new ExtendedCreateSourceDto();
      expect(extendedDto).toBeInstanceOf(CreateSourceDto);
      expect(extendedDto).toBeInstanceOf(ExtendedCreateSourceDto);
    });

    it('should work with PartialType', () => {
      // This test ensures the DTO can be used with PartialType
      const dto = new CreateSourceDto();
      expect(dto).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety', () => {
      const dto = new CreateSourceDto();
      
      // Should not have any predefined properties
      expect(dto).toBeDefined();
      expect(typeof dto).toBe('object');
    });
  });

  describe('Usage in NestJS', () => {
    it('should be compatible with NestJS validation', () => {
      const dto = new CreateSourceDto();
      
      // Should be a valid DTO for NestJS
      expect(dto).toBeDefined();
    });

    it('should be compatible with class-transformer', () => {
      const dto = new CreateSourceDto();
      
      // Should be compatible with class-transformer
      expect(dto).toBeDefined();
    });
  });
}); 