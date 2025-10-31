# Testing Guide

This document outlines the testing strategy and procedures for the MaFrance project.

## Overview

The project uses a comprehensive testing suite with both backend and frontend tests:

- **Backend Tests**: Jest with Supertest for API testing
- **Frontend Tests**: Vitest for Vue component testing
- **Performance Tests**: Custom benchmarks for API response times
- **Integration Tests**: End-to-end API testing

## Test Structure

```
__tests__/
├── integration/          # API integration tests
├── middleware/           # Middleware unit tests
├── routes/               # Route handler tests
├── performance/          # Performance benchmarks
├── basic.test.js         # Basic functionality tests
└── setup.js              # Test configuration

client/src/components/**/__tests__/  # Vue component tests
```

## Running Tests

### Backend Tests
```bash
# Run all backend tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- __tests__/routes/articleRoutes.test.js

# Run in watch mode
npm run test:watch
```

### Frontend Tests
```bash
# Run all frontend tests
cd client && npm test

# Run with UI
cd client && npm run test:ui

# Run once (CI mode)
cd client && npm run test:run
```

### All Tests
```bash
# Run backend and frontend together
npm test && cd client && npm test
```

## Test Categories

### Unit Tests
- **Routes**: Test individual route handlers with mocked dependencies
- **Middleware**: Test validation, caching, and error handling
- **Services**: Test business logic in isolation

### Integration Tests
- **API Endpoints**: Test complete request/response cycles
- **Database Operations**: Test with real database connections (where safe)

### Performance Tests
- **Response Times**: Benchmark API endpoints for acceptable performance
- **Concurrent Load**: Test handling of multiple simultaneous requests

### Component Tests
- **Vue Components**: Test rendering, props, and user interactions
- **Store Integration**: Test component behavior with Pinia stores

## Writing Tests

### Backend Test Example
```javascript
const request = require('supertest');
const express = require('express');
const myRoute = require('../routes/myRoute');

describe('My Route', () => {
  it('should return data', async () => {
    const app = express();
    app.use('/api/my', myRoute);

    const response = await request(app)
      .get('/api/my/endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

### Frontend Test Example
```javascript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MyComponent from '../MyComponent.vue'

describe('MyComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyComponent)
    expect(wrapper.exists()).toBe(true)
  })
})
```

## Mocking Strategy

### Database Mocking
```javascript
jest.mock('../config/db', () => ({
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn()
}));
```

### Service Mocking
```javascript
jest.mock('../services/myService', () => ({
  myMethod: jest.fn()
}));
```

### Browser API Mocking
```javascript
Object.assign(navigator, {
  clipboard: { writeText: jest.fn() }
});
global.window.open = jest.fn();
```

## Coverage Requirements

- **Backend**: Aim for >80% coverage on routes, services, and middleware
- **Frontend**: Aim for >70% coverage on components and utilities
- **Critical Paths**: 100% coverage on authentication, validation, and error handling

## CI/CD Integration

Tests run automatically on:
- Push to main branch
- Pull requests to main branch
- Manual workflow dispatch

### GitHub Actions Workflow
- Runs on Ubuntu with Node.js 18 and 20
- Installs dependencies for both backend and frontend
- Runs all test suites
- Generates coverage reports
- Builds frontend to ensure no build errors

## Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

### Mocking
- Mock external dependencies (database, APIs, services)
- Use realistic mock data
- Clean up mocks between tests

### Assertions
- Test behavior, not implementation details
- Use appropriate matchers (`toBe`, `toEqual`, `toContain`, etc.)
- Test error conditions and edge cases

### Performance
- Keep tests fast (< 100ms per test)
- Use `beforeAll`/`afterAll` for expensive setup
- Parallelize independent tests

## Debugging Tests

### Common Issues
- **Mock not working**: Check import order and hoisting
- **Async tests**: Ensure promises are properly awaited
- **DOM tests**: Use `nextTick` for Vue reactivity

### Debugging Tools
```bash
# Run with debug logging
DEBUG=jest:* npm test

# Run single test with verbose output
npm test -- --verbose __tests__/myTest.test.js

# Frontend debugging
cd client && npm run test:ui
```

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Update this documentation if testing patterns change
4. Maintain or improve coverage percentages

When fixing bugs:
1. Write a test that reproduces the bug
2. Fix the bug
3. Ensure the test passes
4. Run full test suite to prevent regressions