'use strict';

const crypto = require('crypto');
const pinoHttp = require('pino-http');
const logger = require('../logger');

/**
 * HTTP request logging middleware.
 *
 * - assigns/propagates an `x-request-id` correlation id
 * - logs structured JSON with method, url, status, duration and request id
 * - ignores noisy, high-frequency probes (/health, /metrics)
 */
const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel(req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} -> ${res.statusCode}`;
  },
  customErrorMessage(req, res) {
    return `${req.method} ${req.url} -> ${res.statusCode}`;
  },
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/metrics' || req.url === '/health/live'
  }
});

module.exports = requestLogger;
