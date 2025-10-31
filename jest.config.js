module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['<rootDir>/client/'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'config/**/*.js',
    '!routes/base/BaseRoute.js', // Exclude base class from coverage
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 10000
};