'use strict';

const express = require('express');
const request = require('supertest');
const { createRateLimiter } = require('../../src/middleware/rateLimiter');

function buildApp(max) {
  const app = express();
  app.use(createRateLimiter({ windowMs: 60000, max, name: 'test', skip: () => false }));
  app.get('/', (req, res) => res.json({ ok: true }));
  return app;
}

describe('rate limiter', () => {
  test('allows requests under the limit and blocks the rest with a JSON error', async () => {
    const app = buildApp(2);

    const first = await request(app).get('/');
    const second = await request(app).get('/');
    const third = await request(app).get('/');

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMITED');
  });

  test('default limiters skip enforcement in the test environment', async () => {
    const { apiLimiter } = require('../../src/middleware/rateLimiter');
    const app = express();
    app.use(apiLimiter);
    app.get('/', (req, res) => res.json({ ok: true }));

    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
    }
  });
});
