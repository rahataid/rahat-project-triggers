import { paginateResult } from './pagination';

describe('paginateResult', () => {
  const mockData = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
    { id: 4, name: 'Item 4' },
    { id: 5, name: 'Item 5' },
    { id: 6, name: 'Item 6' },
    { id: 7, name: 'Item 7' },
    { id: 8, name: 'Item 8' },
    { id: 9, name: 'Item 9' },
    { id: 10, name: 'Item 10' },
    { id: 11, name: 'Item 11' },
    { id: 12, name: 'Item 12' },
  ];

  describe('basic pagination', () => {
    it('should return correct data and metadata for first page', () => {
      const result = paginateResult(mockData, 1, 5);

      expect(result.data).toHaveLength(5);
      expect(result.data).toEqual(mockData.slice(0, 5));
      expect(result.meta).toEqual({
        total: 12,
        lastPage: 3,
        currentPage: 1,
        perPage: 5,
        prev: null,
        next: 2,
      });
    });

    it('should return correct data and metadata for middle page', () => {
      const result = paginateResult(mockData, 2, 5);

      expect(result.data).toHaveLength(5);
      expect(result.data).toEqual(mockData.slice(5, 10));
      expect(result.meta).toEqual({
        total: 12,
        lastPage: 3,
        currentPage: 2,
        perPage: 5,
        prev: 1,
        next: 3,
      });
    });

    it('should return correct data and metadata for last page', () => {
      const result = paginateResult(mockData, 3, 5);

      expect(result.data).toHaveLength(2);
      expect(result.data).toEqual(mockData.slice(10, 12));
      expect(result.meta).toEqual({
        total: 12,
        lastPage: 3,
        currentPage: 3,
        perPage: 5,
        prev: 2,
        next: null,
      });
    });
  });

  describe('default parameters', () => {
    it('should use default page and perPage when not provided', () => {
      const result = paginateResult(mockData);

      expect(result.data).toHaveLength(10);
      expect(result.data).toEqual(mockData.slice(0, 10));
      expect(result.meta).toEqual({
        total: 12,
        lastPage: 2,
        currentPage: 1,
        perPage: 10,
        prev: null,
        next: 2,
      });
    });

    it('should use default page when only perPage is provided', () => {
      const result = paginateResult(mockData, undefined, 3);

      expect(result.data).toHaveLength(3);
      expect(result.data).toEqual(mockData.slice(0, 3));
      expect(result.meta).toEqual({
        total: 12,
        lastPage: 4,
        currentPage: 1,
        perPage: 3,
        prev: null,
        next: 2,
      });
    });

    it('should use default perPage when only page is provided', () => {
      const result = paginateResult(mockData, 2);

      expect(result.data).toHaveLength(2);
      expect(result.data).toEqual(mockData.slice(10, 12));
      expect(result.meta).toEqual({
        total: 12,
        lastPage: 2,
        currentPage: 2,
        perPage: 10,
        prev: 1,
        next: null,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const result = paginateResult([], 1, 5);

      expect(result.data).toHaveLength(0);
      expect(result.meta).toEqual({
        total: 0,
        lastPage: 1,
        currentPage: 1,
        perPage: 5,
        prev: null,
        next: null,
      });
    });

    it('should handle page number less than 1', () => {
      const result = paginateResult(mockData, 0, 5);

      expect(result.data).toHaveLength(5);
      expect(result.data).toEqual(mockData.slice(0, 5));
      expect(result.meta).toEqual({
        total: 12,
        lastPage: 3,
        currentPage: 1,
        perPage: 5,
        prev: null,
        next: 2,
      });
    });

    it('should handle negative page number', () => {
      const result = paginateResult(mockData, -5, 5);

      expect(result.data).toHaveLength(5);
      expect(result.data).toEqual(mockData.slice(0, 5));
      expect(result.meta).toEqual({
        total: 12,
        lastPage: 3,
        currentPage: 1,
        perPage: 5,
        prev: null,
        next: 2,
      });
    });

    it('should handle page number greater than last page', () => {
      const result = paginateResult(mockData, 10, 5);

      expect(result.data).toHaveLength(2);
      expect(result.data).toEqual(mockData.slice(10, 12));
      expect(result.meta).toEqual({
        total: 12,
        lastPage: 3,
        currentPage: 3,
        perPage: 5,
        prev: 2,
        next: null,
      });
    });

    it('should handle single item array', () => {
      const singleItem = [{ id: 1, name: 'Single Item' }];
      const result = paginateResult(singleItem, 1, 5);

      expect(result.data).toHaveLength(1);
      expect(result.data).toEqual(singleItem);
      expect(result.meta).toEqual({
        total: 1,
        lastPage: 1,
        currentPage: 1,
        perPage: 5,
        prev: null,
        next: null,
      });
    });

    it('should handle exact division of items by perPage', () => {
      const exactData = mockData.slice(0, 10); // Exactly 10 items
      const result = paginateResult(exactData, 2, 5);

      expect(result.data).toHaveLength(5);
      expect(result.data).toEqual(exactData.slice(5, 10));
      expect(result.meta).toEqual({
        total: 10,
        lastPage: 2,
        currentPage: 2,
        perPage: 5,
        prev: 1,
        next: null,
      });
    });

    it('should handle perPage larger than total items', () => {
      const result = paginateResult(mockData, 1, 20);

      expect(result.data).toHaveLength(12);
      expect(result.data).toEqual(mockData);
      expect(result.meta).toEqual({
        total: 12,
        lastPage: 1,
        currentPage: 1,
        perPage: 20,
        prev: null,
        next: null,
      });
    });
  });

  describe('type safety', () => {
    it('should work with different data types', () => {
      const stringArray = ['a', 'b', 'c', 'd', 'e'];
      const result = paginateResult(stringArray, 1, 2);

      expect(result.data).toEqual(['a', 'b']);
      expect(result.meta.total).toBe(5);
    });

    it('should work with number arrays', () => {
      const numberArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = paginateResult(numberArray, 2, 3);

      expect(result.data).toEqual([4, 5, 6]);
      expect(result.meta.currentPage).toBe(2);
    });

    it('should work with complex objects', () => {
      const complexObjects = [
        { id: 1, nested: { value: 'test1' }, array: [1, 2, 3] },
        { id: 2, nested: { value: 'test2' }, array: [4, 5, 6] },
        { id: 3, nested: { value: 'test3' }, array: [7, 8, 9] },
      ];
      const result = paginateResult(complexObjects, 1, 2);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].nested.value).toBe('test1');
      expect(result.data[1].array).toEqual([4, 5, 6]);
    });
  });
});
