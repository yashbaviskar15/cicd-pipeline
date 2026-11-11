'use strict';

const logger = require('../logger');

/**
 * Translate Prisma "known request errors" into API-friendly responses.
 *
 * @param {any} err
 * @returns {{statusCode: number, code: string, message: string}|null}
 */
function normalizePrismaError(err) {
  if (!err || typeof err.code !== 'string' || !err.code.startsWith('P')) {
    return null;
  }
  switch (err.code) {
    case 'P2002':
      return { statusCode: 409, code: 'CONFLICT', message: 'Resource already exists' };
    case 'P2025':
      return { statusCode: 404, code: 'NOT_FOUND', message: 'Resource not found' };
    case 'P2003':
      return { statusCode: 400, code: 'BAD_REQUEST', message: 'Related resource does not exist' };
    default:
      return null;
  }
}

/**
 * Centralized Express error handler. Produces a stable JSON error envelope:
 * `{ error: { code, message, details?, requestId } }`
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const mapped = normalizePrismaError(err);

  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (mapped) {
    statusCode = mapped.statusCode;
    code = mapped.code;
    message = mapped.message;
    details = undefined;
  }

  if (statusCode >= 500) {
    logger.error({ err, requestId: req.id }, 'Unhandled error');
  } else {
    logger.warn({ code, requestId: req.id, path: req.originalUrl }, 'Request error');
  }

  // Never leak stack traces / internal messages for unexpected (5xx) errors.
  if (statusCode >= 500 && !err.isOperational) {
    message = 'Internal server error';
  }

  const body = { error: { code, message, requestId: req.id } };
  if (details) {
    body.error.details = details;
  }

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
module.exports.normalizePrismaError = normalizePrismaError;
