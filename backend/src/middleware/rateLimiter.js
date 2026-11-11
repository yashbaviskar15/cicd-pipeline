'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Build an express-rate-limit middleware that returns a JSON error body
 * consistent with the rest of the API (instead of the default text body).
 *
 * @param {{windowMs: number, max: number, name?: string, skip?: Function}} options
 */
function createRateLimiter({ windowMs, max, name = 'rate-limit', skip }) {
  return rateLimit({
    windowMs,
    max,
    name,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skip || (() => config.isTest),
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later',
          requestId: req.id
        }
      });
    }
  });
}

/** Global limiter applied to every /api route. */
const apiLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  name: 'api'
});

/** Stricter limiter for credential endpoints (brute-force protection). */
const authLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  name: 'auth'
});

module.exports = { createRateLimiter, apiLimiter, authLimiter };
