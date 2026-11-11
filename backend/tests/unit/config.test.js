'use strict';

const { loadConfig } = require('../../src/config');

describe('config', () => {
  test('applies sensible defaults', () => {
    const config = loadConfig({});
    expect(config.env).toBe('development');
    expect(config.port).toBe(3000);
    expect(config.corsOrigin).toBe('*');
    expect(config.metricsEnabled).toBe(true);
    expect(config.otel.enabled).toBe(false);
  });

  test('splits comma separated CORS origins', () => {
    const config = loadConfig({ CORS_ORIGIN: 'https://a.com, https://b.com' });
    expect(config.corsOrigin).toEqual(['https://a.com', 'https://b.com']);
  });

  test('coerces boolean-like strings (including "false")', () => {
    const config = loadConfig({ TRUST_PROXY: 'true', OTEL_ENABLED: 'false', METRICS_ENABLED: '0' });
    expect(config.trustProxy).toBe(true);
    expect(config.otel.enabled).toBe(false);
    expect(config.metricsEnabled).toBe(false);
  });

  test('forwards a "yes" value to true', () => {
    expect(loadConfig({ OTEL_ENABLED: 'yes' }).otel.enabled).toBe(true);
  });

  test('throws on invalid values', () => {
    expect(() => loadConfig({ PORT: 'not-a-number' })).toThrow(/Invalid environment configuration/);
  });

  test('refuses the default JWT secret in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });

  test('accepts a strong secret in production', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'a-very-strong-production-secret-value'
    });
    expect(config.isProduction).toBe(true);
  });

  test('silences logs in test env', () => {
    expect(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'debug' }).logLevel).toBe('silent');
  });
});
