'use strict';

const spec = require('../../src/openapi');
const config = require('../../src/config');

describe('openapi spec', () => {
  test('is a valid OpenAPI 3 document', () => {
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info.title).toBeDefined();
    expect(spec.info.version).toBe(config.serviceVersion);
  });

  test('documents the core paths', () => {
    expect(Object.keys(spec.paths)).toEqual(
      expect.arrayContaining([
        '/health',
        '/health/ready',
        '/metrics',
        '/api/auth/register',
        '/api/auth/login',
        '/api/tasks',
        '/api/tasks/{id}'
      ])
    );
  });

  test('declares bearer auth and the Task schema', () => {
    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    expect(spec.components.schemas.Task).toBeDefined();
  });
});
