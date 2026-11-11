'use strict';

const userRepository = require('../repositories/userRepository');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyToken } = require('../utils/tokens');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../utils/errors');
const config = require('../config');

/**
 * Strip the password hash (and any internal fields) before returning a user.
 *
 * @param {object} user
 */
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt
  };
}

/**
 * Issue an access + refresh token pair for a user.
 *
 * @param {object} user
 */
function buildAuthResponse(user) {
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ sub: user.id, email: user.email }),
    refreshToken: signRefreshToken({ sub: user.id }),
    tokenType: 'Bearer',
    expiresIn: config.jwt.expiresIn
  };
}

/**
 * Register a new user.
 *
 * @param {{email: string, name: string, password: string}} input
 */
async function register({ email, name, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }
  const hashed = await hashPassword(password);
  const user = await userRepository.create({ email, name, password: hashed, role: 'user' });
  return buildAuthResponse(user);
}

/**
 * Authenticate an existing user.
 *
 * @param {{email: string, password: string}} input
 */
async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  // Use the same error for "unknown user" and "wrong password" to avoid
  // leaking which emails are registered.
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }
  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }
  return buildAuthResponse(user);
}

/**
 * Exchange a refresh token for a new token pair.
 *
 * @param {string} refreshToken
 */
async function refresh(refreshToken) {
  const decoded = verifyToken(refreshToken, 'refresh');
  const user = await userRepository.findById(decoded.sub);
  if (!user) {
    throw new UnauthorizedError('User no longer exists');
  }
  return buildAuthResponse(user);
}

/**
 * Return the profile for the authenticated user id.
 *
 * @param {string} userId
 */
async function me(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return toPublicUser(user);
}

module.exports = { register, login, refresh, me, toPublicUser };
