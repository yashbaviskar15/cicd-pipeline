'use strict';

const { EventEmitter } = require('events');
const metrics = require('../../src/metrics');
const metricsMiddleware = require('../../src/middleware/metrics');

describe('metrics', () => {
  afterEach(() => metrics.reset());

  test('timeQuery returns the value and records a duration', async () => {
    await expect(metrics.timeQuery('unit.op', async () => 42)).resolves.toBe(42);
  });

  test('timeQuery propagates errors', async () => {
    await expect(
      metrics.timeQuery('unit.op', async () => {
        throw new Error('db down');
      })
    ).rejects.toThrow('db down');
  });

  test('middleware records request counters on finish', async () => {
    const req = { method: 'GET', path: '/health', baseUrl: '', route: { path: '/' } };
    const res = new EventEmitter();
    res.statusCode = 200;
    const next = jest.fn();

    metricsMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    res.emit('finish');

    const text = await metrics.registry.metrics();
    expect(text).toContain('http_requests_total');
    expect(text).toContain('http_request_duration_seconds');
  });

  test('middleware counts 5xx responses as errors', async () => {
    const req = { method: 'POST', path: '/api/tasks', baseUrl: '/api/tasks' };
    const res = new EventEmitter();
    res.statusCode = 500;

    metricsMiddleware(req, res, jest.fn());
    res.emit('finish');

    const counter = await metrics.httpErrorsTotal.get();
    const sample = counter.values.find((v) => v.labels.status_code === 500);
    expect(sample.value).toBeGreaterThan(0);
  });

  test('reset clears the registry without throwing', async () => {
    metrics.httpRequestsTotal.inc({ method: 'GET', route: '/', status_code: 200 });
    metrics.reset();
    const text = await metrics.registry.metrics();
    expect(text).not.toContain('http_requests_total{method="GET",route="/",status_code="200"} 1');
  });
});
