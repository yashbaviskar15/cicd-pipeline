'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('./errors');

const ACCESS_TOKEN_TYPE = 'access';
const REFRESH_TOKEN_TYPE = 'refresh';

/**
 * Sign a short-lived access token.
 *
 * @param {{sub: string, email: string}} payload
 * @returns {string} signed JWT
 */
function signAccessToken(payload) {
  return jwt.sign({ ...payload, type: ACCESS_TOKEN_TYPE }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'cicd-backend'
  });
}

/**
 * Sign a long-lived refresh token.
 *
 * @param {{sub: string}} payload
 * @returns {string} signed JWT
 */
function signRefreshToken(payload) {
  return jwt.sign({ ...payload, type: REFRESH_TOKEN_TYPE }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'cicd-backend'
  });
}

/**
 * Verify a token and enforce its expected type.
 *
 * @param {string} token
 * @param {string} expectedType access | refresh
 * @returns {object} decoded payload
 * @throws {UnauthorizedError}
 */
function verifyToken(token, expectedType) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, { issuer: 'cicd-backend' });
    if (expectedType && decoded.type !== expectedType) {
      throw new UnauthorizedError('Invalid token type');
    }
    return decoded;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  ACCESS_TOKEN_TYPE,
  REFRESH_TOKEN_TYPE
};
