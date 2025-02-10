module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',

  // Security-focused settings
  maxWorkers: '50%', // Limit parallel execution
  testTimeout: 10000, // Increased timeout for encryption
  verbose: true,

  // Module aliases
  moduleNameMapper: {
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1'
  },

  // Coverage settings
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    '!lib/types/**',
    '!lib/prisma/**'
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    }
  }
}
