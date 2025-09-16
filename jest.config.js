/**
 * Jest configuration for Lead Scoring Backend API
 * 
 * Configures Jest testing framework with TypeScript support
 * and appropriate test environment settings.
 */

module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Set test environment to Node.js
  testEnvironment: 'node',
  
  // Root directory for tests
  rootDir: './src',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true
};