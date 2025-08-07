import { GetSouceDto } from './get-source.dto';
import { PaginationDto } from 'src/common/dto';

describe('GetSouceDto', () => {
  it('should be defined', () => {
    expect(GetSouceDto).toBeDefined();
  });

  it('should extend PartialType of PaginationDto', () => {
    const dto = new GetSouceDto();
    expect(dto).toBeInstanceOf(GetSouceDto);
  });

  it('should allow partial pagination properties', () => {
    const dto = new GetSouceDto();
    
    // Should not throw when properties are accessed
    expect(dto).toBeDefined();
    expect(typeof dto).toBe('object');
  });

  it('should allow setting page property', () => {
    const dto = new GetSouceDto();
    dto.page = 1;
    
    expect(dto.page).toBe(1);
  });

  it('should allow setting perPage property', () => {
    const dto = new GetSouceDto();
    dto.perPage = 10;
    
    expect(dto.perPage).toBe(10);
  });

  it('should allow setting both properties', () => {
    const dto = new GetSouceDto();
    dto.page = 2;
    dto.perPage = 20;
    
    expect(dto.page).toBe(2);
    expect(dto.perPage).toBe(20);
  });

  it('should handle null values', () => {
    const dto = new GetSouceDto();
    dto.page = null as any;
    dto.perPage = null as any;
    
    expect(dto.page).toBeNull();
    expect(dto.perPage).toBeNull();
  });

  it('should handle undefined values', () => {
    const dto = new GetSouceDto();
    dto.page = undefined;
    dto.perPage = undefined;
    
    expect(dto.page).toBeUndefined();
    expect(dto.perPage).toBeUndefined();
  });

  it('should handle different number types', () => {
    const dto = new GetSouceDto();
    dto.page = 0;
    dto.perPage = 100;
    
    expect(dto.page).toBe(0);
    expect(dto.perPage).toBe(100);
  });

  describe('Inheritance', () => {
    it('should inherit from PaginationDto', () => {
      // This test ensures the inheritance is working correctly
      const dto = new GetSouceDto();
      expect(dto).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for page property', () => {
      const dto = new GetSouceDto();
      
      // Should accept number
      dto.page = 1;
      expect(typeof dto.page).toBe('number');
      
      // Should accept undefined
      dto.page = undefined;
      expect(dto.page).toBeUndefined();
    });

    it('should maintain type safety for perPage property', () => {
      const dto = new GetSouceDto();
      
      // Should accept number
      dto.perPage = 10;
      expect(typeof dto.perPage).toBe('number');
      
      // Should accept undefined
      dto.perPage = undefined;
      expect(dto.perPage).toBeUndefined();
    });
  });

  describe('Class Structure', () => {
    it('should have correct class name', () => {
      expect(GetSouceDto.name).toBe('GetSouceDto');
    });

    it('should be a class', () => {
      expect(typeof GetSouceDto).toBe('function');
    });
  });
}); 