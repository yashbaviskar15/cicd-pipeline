'use strict';

const authenticate = require('../../src/middleware/auth');
const { signAccessToken, signRefreshToken } = require('../../src/utils/tokens');
const { UnauthorizedError } = require('../../src/utils/errors');

describe('authenticate middleware', () => {
  test('rejects a missing Authorization header', () => {
    const next = jest.fn();
    authenticate({ headers: {} }, {}, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test('rejects a non-bearer header', () => {
    const next = jest.fn();
    authenticate({ headers: { authorization: 'Basic abc' } }, {}, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test('rejects an empty bearer token', () => {
    const next = jest.fn();
    authenticate({ headers: { authorization: 'Bearer   ' } }, {}, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test('populates req.user for a valid access token', () => {
    const next = jest.fn();
    const token = signAccessToken({ sub: 'u1', email: 'a@b.com' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    authenticate(req, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  test('rejects a refresh token used as an access token', () => {
    const next = jest.fn();
    const token = signRefreshToken({ sub: 'u1' });
    authenticate({ headers: { authorization: `Bearer ${token}` } }, {}, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });
});
