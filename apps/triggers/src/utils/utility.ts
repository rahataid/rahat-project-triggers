export const lowerCaseObjectKeys = (obj: any, visited = new WeakSet()): any => {
  if (typeof obj !== 'object' || obj === null) {
    // Return the value if it's not an object
    return obj;
  }

  // Handle circular references
  if (visited.has(obj)) {
    return obj;
  }

  if (Array.isArray(obj)) {
    // Process each element in the array
    return obj.map((item) => lowerCaseObjectKeys(item, visited));
  }

  // Handle built-in objects (Date, RegExp, etc.) that shouldn't be processed recursively
  if (obj instanceof Date || obj instanceof RegExp || obj instanceof Function) {
    return obj;
  }

  visited.add(obj);

  // Process each key-value pair in the object
  const lowerCaseObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      lowerCaseObj[key.toLowerCase()] = lowerCaseObjectKeys(obj[key], visited);
    }
  }

  // Handle symbol keys
  const symbolKeys = Object.getOwnPropertySymbols(obj);
  for (const symbolKey of symbolKeys) {
    if (Object.prototype.propertyIsEnumerable.call(obj, symbolKey)) {
      lowerCaseObj[symbolKey] = lowerCaseObjectKeys(obj[symbolKey], visited);
    }
  }

  visited.delete(obj);
  return lowerCaseObj;
};
