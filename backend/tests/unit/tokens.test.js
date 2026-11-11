'use strict';

const jwt = require('jsonwebtoken');
const {
  signAccessToken,
  signRefreshToken,
  verifyToken
} = require('../../src/utils/tokens');
const config = require('../../src/config');

describe('token utils', () => {
  test('signs and verifies an access token', () => {
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.com' });
    const decoded = verifyToken(token, 'access');
    expect(decoded.sub).toBe('user-1');
    expect(decoded.email).toBe('a@b.com');
    expect(decoded.type).toBe('access');
  });

  test('signs and verifies a refresh token', () => {
    const decoded = verifyToken(signRefreshToken({ sub: 'user-2' }), 'refresh');
    expect(decoded.sub).toBe('user-2');
    expect(decoded.type).toBe('refresh');
  });

  test('rejects a token with the wrong type', () => {
    const refresh = signRefreshToken({ sub: 'user-3' });
    expect(() => verifyToken(refresh, 'access')).toThrow(/Invalid token type/);
  });

  test('rejects a token signed with another secret', () => {
    const foreign = jwt.sign({ sub: 'x', type: 'access' }, 'another-secret-value-123456', {
      issuer: 'cicd-backend'
    });
    expect(() => verifyToken(foreign, 'access')).toThrow(/Invalid token/);
  });

  test('rejects an expired token', () => {
    const expired = jwt.sign({ sub: 'x', type: 'access' }, config.jwt.secret, {
      expiresIn: '-1s',
      issuer: 'cicd-backend'
    });
    expect(() => verifyToken(expired, 'access')).toThrow(/Token expired/);
  });

  test('rejects garbage input', () => {
    expect(() => verifyToken('not-a-jwt', 'access')).toThrow(/Invalid token/);
  });
});
