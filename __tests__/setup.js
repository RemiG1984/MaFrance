// Test setup file
// const path = require('path'); // Not used

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:'; // Use in-memory database for tests

// Mock console methods to reduce noise during tests
Object.assign(console, {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});