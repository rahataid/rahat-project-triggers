import { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(.*/)?(msgpackr|msgpackr-extract|bull|uuid)(/|$))',
  ],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@lib/database$': '<rootDir>/../../packages/database/dist/index.js',
    '^@lib/database/(.*)$': '<rootDir>/../../packages/database/dist/$1',
    '^@lib/core$': '<rootDir>/../../packages/core/dist/index.js',
    '^@lib/core/(.*)$': '<rootDir>/../../packages/core/dist/$1',
    '^@lib/dhm-adapter$': '<rootDir>/../../packages/dhm-adapter/dist/index.js',
    '^@lib/dhm-adapter/(.*)$': '<rootDir>/../../packages/dhm-adapter/dist/$1',
    '^@lib/glofas-adapter$':
      '<rootDir>/../../packages/glofas-adapter/dist/index.js',
    '^@lib/glofas-adapter/(.*)$':
      '<rootDir>/../../packages/glofas-adapter/dist/$1',
  },
};

export default config;
