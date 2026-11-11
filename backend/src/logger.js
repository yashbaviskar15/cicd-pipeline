'use strict';

const pino = require('pino');
const config = require('./config');

/**
 * Structured JSON logger. In production every log line is a single JSON
 * object (machine parsable by Loki/CloudWatch). In development a pretty
 * transport can be enabled with LOG_PRETTY=true.
 */
const logger = pino({
  level: config.logLevel,
  base: { service: 'cicd-backend', version: config.serviceVersion },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      'token',
      '*.token',
      'refreshToken',
      '*.refreshToken'
    ],
    censor: '[REDACTED]'
  },
  transport: config.logPretty && !config.isTest
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
    : undefined
});

module.exports = logger;
