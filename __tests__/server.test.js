const request = require('supertest');
const app = require('../server');

describe('Server', () => {
  describe('GET /', () => {
    it('should return OK for Google health check', async() => {
      const response = await request(app)
        .get('/')
        .set('User-Agent', 'GoogleHC/1.0');

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });

    it('should serve index.html for regular requests', async() => {
      const response = await request(app)
        .get('/')
        .set('User-Agent', 'Mozilla/5.0');

      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
    });
  });

  describe('GET /api/version', () => {
    it('should return version information', async() => {
      const response = await request(app)
        .get('/api/version');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('buildHash');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /{*path}', () => {
    it('should return 404 for API routes', async() => {
      const response = await request(app)
        .get('/api/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should return 404 for static files', async() => {
      const response = await request(app)
        .get('/assets/nonexistent.js');

      expect(response.status).toBe(404);
    });
  });
});