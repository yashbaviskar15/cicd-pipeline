'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config');

/**
 * Hash a plaintext password using bcrypt (pure-JS implementation so no
 * native build toolchain is required in the container image).
 *
 * @param {string} plain
 * @returns {Promise<string>} bcrypt hash
 */
function hashPassword(plain) {
  return bcrypt.hash(plain, config.bcryptRounds);
}

/**
 * Compare a plaintext password against a bcrypt hash in constant time.
 *
 * @param {string} plain
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
