const request = require('supertest');
const express = require('express');

// Create a simple test app
const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/test-error', (_req, _res) => {
  throw new Error('Test error');
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  res.status(500).json({ error: err.message });
});

describe('Basic API Tests', () => {
  it('should return health check', async() => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      message: 'Server is running'
    });
  });

  it('should handle errors properly', async() => {
    const response = await request(app)
      .get('/api/test-error')
      .expect(500);

    expect(response.body).toHaveProperty('error');
  });
});

describe('Testing Framework', () => {
  it('should have Jest working', () => {
    expect(true).toBe(true);
  });

  it('should support async/await', async() => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should support mocking', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});