import { lowerCaseObjectKeys } from './utility';

describe('lowerCaseObjectKeys', () => {
  describe('primitive values', () => {
    it('should return string values unchanged', () => {
      expect(lowerCaseObjectKeys('hello')).toBe('hello');
      expect(lowerCaseObjectKeys('')).toBe('');
      expect(lowerCaseObjectKeys('UPPERCASE')).toBe('UPPERCASE');
    });

    it('should return number values unchanged', () => {
      expect(lowerCaseObjectKeys(42)).toBe(42);
      expect(lowerCaseObjectKeys(0)).toBe(0);
      expect(lowerCaseObjectKeys(-123.45)).toBe(-123.45);
      expect(lowerCaseObjectKeys(NaN)).toBe(NaN);
      expect(lowerCaseObjectKeys(Infinity)).toBe(Infinity);
    });

    it('should return boolean values unchanged', () => {
      expect(lowerCaseObjectKeys(true)).toBe(true);
      expect(lowerCaseObjectKeys(false)).toBe(false);
    });

    it('should return null unchanged', () => {
      expect(lowerCaseObjectKeys(null)).toBe(null);
    });

    it('should return undefined unchanged', () => {
      expect(lowerCaseObjectKeys(undefined)).toBe(undefined);
    });
  });

  describe('arrays', () => {
    it('should process each element in a simple array', () => {
      const input = [
        { FirstName: 'John', LastName: 'Doe' },
        { FirstName: 'Jane', LastName: 'Smith' },
      ];
      const expected = [
        { firstname: 'John', lastname: 'Doe' },
        { firstname: 'Jane', lastname: 'Smith' },
      ];

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });

    it('should handle arrays with mixed types', () => {
      const input = [
        'string',
        123,
        { CamelCase: 'value' },
        null,
        undefined,
        true,
      ];
      const expected = [
        'string',
        123,
        { camelcase: 'value' },
        null,
        undefined,
        true,
      ];

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });

    it('should handle empty arrays', () => {
      expect(lowerCaseObjectKeys([])).toEqual([]);
    });

    it('should handle nested arrays', () => {
      const input = [[{ OuterKey: 'value1' }], [{ InnerKey: 'value2' }]];
      const expected = [[{ outerkey: 'value1' }], [{ innerkey: 'value2' }]];

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });
  });

  describe('simple objects', () => {
    it('should convert all keys to lowercase', () => {
      const input = { FirstName: 'John', LastName: 'Doe', AGE: 30 };
      const expected = { firstname: 'John', lastname: 'Doe', age: 30 };

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });

    it('should handle empty objects', () => {
      expect(lowerCaseObjectKeys({})).toEqual({});
    });

    it('should handle keys that are already lowercase', () => {
      const input = { firstname: 'John', lastname: 'Doe' };
      const expected = { firstname: 'John', lastname: 'Doe' };

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });

    it('should handle special characters in keys', () => {
      const input = {
        'First-Name': 'John',
        Last_Name: 'Doe',
        'Email@Domain': 'test@example.com',
      };
      const expected = {
        'first-name': 'John',
        last_name: 'Doe',
        'email@domain': 'test@example.com',
      };

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });

    it('should handle numeric keys (converted to strings)', () => {
      const input = { 123: 'numeric key', ABC: 'alpha key' };
      const expected = { 123: 'numeric key', abc: 'alpha key' };

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });

    it('should handle keys with spaces', () => {
      const input = { 'First Name': 'John', 'LAST NAME': 'Doe' };
      const expected = { 'first name': 'John', 'last name': 'Doe' };

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });
  });

  describe('nested objects', () => {
    it('should convert keys in nested objects', () => {
      const input = {
        User: {
          FirstName: 'John',
          LastName: 'Doe',
          Contact: {
            Email: 'john@example.com',
            Phone: '123-456-7890',
          },
        },
      };
      const expected = {
        user: {
          firstname: 'John',
          lastname: 'Doe',
          contact: {
            email: 'john@example.com',
            phone: '123-456-7890',
          },
        },
      };

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });

    it('should handle deeply nested objects', () => {
      const input = {
        Level1: {
          Level2: {
            Level3: {
              Level4: {
                DeepValue: 'deep',
              },
            },
          },
        },
      };
      const expected = {
        level1: {
          level2: {
            level3: {
              level4: {
                deepvalue: 'deep',
              },
            },
          },
        },
      };

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });
  });

  describe('mixed structures', () => {
    it('should handle objects containing arrays', () => {
      const input = {
        Users: [
          { FirstName: 'John', LastName: 'Doe' },
          { FirstName: 'Jane', LastName: 'Smith' },
        ],
        Settings: {
          Theme: 'dark',
          Language: 'EN',
        },
      };
      const expected = {
        users: [
          { firstname: 'John', lastname: 'Doe' },
          { firstname: 'Jane', lastname: 'Smith' },
        ],
        settings: {
          theme: 'dark',
          language: 'EN',
        },
      };

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });

    it('should handle arrays containing nested objects and arrays', () => {
      const input = [
        {
          Company: 'TechCorp',
          Employees: [
            { Name: 'Alice', Role: 'Developer' },
            { Name: 'Bob', Role: 'Designer' },
          ],
        },
        {
          Company: 'DataInc',
          Employees: [{ Name: 'Charlie', Role: 'Analyst' }],
        },
      ];
      const expected = [
        {
          company: 'TechCorp',
          employees: [
            { name: 'Alice', role: 'Developer' },
            { name: 'Bob', role: 'Designer' },
          ],
        },
        {
          company: 'DataInc',
          employees: [{ name: 'Charlie', role: 'Analyst' }],
        },
      ];

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });
  });

  describe('edge cases', () => {
    it('should handle objects with null values', () => {
      const input = { FirstName: null, LastName: 'Doe', MiddleName: undefined };
      const expected = {
        firstname: null,
        lastname: 'Doe',
        middlename: undefined,
      };

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });

    it('should handle objects with function values', () => {
      const testFunction = () => 'test';
      const input = { MyFunction: testFunction, OtherKey: 'value' };
      const expected = { myfunction: testFunction, otherkey: 'value' };

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });

    it('should handle objects with date values', () => {
      const testDate = new Date('2023-01-01');
      const input = { CreatedAt: testDate, UpdatedAt: testDate };
      const expected = { createdat: testDate, updatedat: testDate };

      expect(lowerCaseObjectKeys(input)).toEqual(expected);
    });

    it('should handle circular references without infinite loops', () => {
      const input: any = { Name: 'Test' };
      input.Self = input;

      // This should not throw an error or cause infinite recursion
      const result = lowerCaseObjectKeys(input);

      expect(result.name).toBe('Test');
      expect(result.self).toBe(input); // Circular reference is preserved as-is
    });

    it('should handle objects with symbol keys', () => {
      const symbolKey = Symbol('test');
      const input = { StringKey: 'value', [symbolKey]: 'symbol value' };

      const result = lowerCaseObjectKeys(input);

      expect(result.stringkey).toBe('value');
      // Symbol keys should be preserved as-is since they can't be lowercased
      expect(result[symbolKey]).toBe('symbol value');
    });

    it('should handle objects with non-enumerable properties', () => {
      const input = { NormalKey: 'normal' };
      Object.defineProperty(input, 'HiddenKey', {
        value: 'hidden',
        enumerable: false,
        writable: true,
        configurable: true,
      });

      const result = lowerCaseObjectKeys(input);

      expect(result.normalkey).toBe('normal');
      // Non-enumerable properties should not be included
      expect(result.hiddenkey).toBeUndefined();
      expect(result.HiddenKey).toBeUndefined();
    });

    it('should handle arrays with holes (sparse arrays)', () => {
      const input = [];
      input[0] = { FirstKey: 'first' };
      input[2] = { SecondKey: 'second' }; // index 1 is undefined

      const result = lowerCaseObjectKeys(input);

      expect(result[0]).toEqual({ firstkey: 'first' });
      expect(result[1]).toBeUndefined();
      expect(result[2]).toEqual({ secondkey: 'second' });
      expect(result.length).toBe(3);
    });
  });

  describe('hasOwnProperty edge cases', () => {
    it('should handle objects without hasOwnProperty method', () => {
      const input = Object.create(null);
      input.TestKey = 'value';

      const result = lowerCaseObjectKeys(input);

      expect(result.testkey).toBe('value');
    });

    it('should handle inherited properties correctly', () => {
      const parent = { InheritedKey: 'inherited' };
      const child = Object.create(parent);
      child.OwnKey = 'own';

      const result = lowerCaseObjectKeys(child);

      // Should only process own properties, not inherited ones
      expect(result.ownkey).toBe('own');
      expect(result.inheritedkey).toBeUndefined();
    });
  });

  describe('type preservation', () => {
    it('should preserve all value types correctly', () => {
      const input = {
        StringVal: 'string',
        NumberVal: 42,
        BooleanVal: true,
        NullVal: null,
        UndefinedVal: undefined,
        ArrayVal: [1, 2, 3],
        ObjectVal: { nested: 'value' },
        DateVal: new Date('2023-01-01'),
        RegexVal: /test/g,
      };

      const result = lowerCaseObjectKeys(input);

      expect(typeof result.stringval).toBe('string');
      expect(typeof result.numberval).toBe('number');
      expect(typeof result.booleanval).toBe('boolean');
      expect(result.nullval).toBe(null);
      expect(result.undefinedval).toBe(undefined);
      expect(Array.isArray(result.arrayval)).toBe(true);
      expect(typeof result.objectval).toBe('object');
      expect(result.dateval instanceof Date).toBe(true);
      expect(result.regexval instanceof RegExp).toBe(true);
    });
  });
});
