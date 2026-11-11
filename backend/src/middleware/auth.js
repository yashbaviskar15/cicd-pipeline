'use strict';

const { verifyToken } = require('../utils/tokens');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Authenticate an incoming request via the `Authorization: Bearer <jwt>`
 * header. On success `req.user` is populated with `{ id, email }`.
 */
function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(new UnauthorizedError('Missing bearer token'));
  }

  try {
    const decoded = verifyToken(token, 'access');
    req.user = { id: decoded.sub, email: decoded.email };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = authenticate;
