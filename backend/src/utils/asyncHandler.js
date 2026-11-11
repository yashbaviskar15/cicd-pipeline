'use strict';

/**
 * Wraps an async Express handler so rejected promises are forwarded to the
 * centralized error middleware instead of crashing the process.
 *
 * @param {Function} fn async (req, res, next) => Promise
 * @returns {Function} express middleware
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
