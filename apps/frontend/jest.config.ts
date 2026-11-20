import type { Config } from 'jest';

const config: Config = {
  displayName: 'frontend-unit',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/apps/frontend',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.spec.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/main.tsx',
    '!src/**/*.d.ts',
  ],
  moduleNameMapper: {
    '^@stellode/models$': '<rootDir>/../../libs/models/src/index.ts',
    '\\.(css|less|scss|sass)$': '<rootDir>/src/test/style-mock.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup-tests.ts'],
};

export default config;
