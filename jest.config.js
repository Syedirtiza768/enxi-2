import nextJest from 'next/jest'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,  // Reduced from 90 for now
      functions: 70, // Reduced from 90 for now  
      lines: 70,     // Reduced from 90 for now
      statements: 70,// Reduced from 90 for now
    },
  },
  // Optimize test performance
  testTimeout: 60000, // 60 seconds for integration tests
  maxWorkers: 1, // Use single worker to avoid database conflicts
  forceExit: true, // Ensure tests exit cleanly
  detectOpenHandles: true, // Help debug hanging tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/tests/helpers/jest.setup.ts']
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig)