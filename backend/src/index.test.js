const request = require('supertest');
const app = require('./index');

describe('Backend API Tests', () => {
  test('GET /health should return healthy status', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.service).toBe('backend');
    expect(response.body.timestamp).toBeDefined();
  });

  test('GET /api/data should return correct message', async () => {
    const response = await request(app).get('/api/data');
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Hello from the backend service!');
    expect(response.body.version).toBe('1.0.0');
  });

  test('GET /api/data should return custom version from env', async () => {
    process.env.VERSION = '2.0.0';
    const response = await request(app).get('/api/data');
    expect(response.statusCode).toBe(200);
    expect(response.body.version).toBe('2.0.0');
    delete process.env.VERSION;
  });
});
