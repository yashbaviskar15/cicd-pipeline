'use strict';

const { NotFoundError } = require('../utils/errors');

/**
 * Catch-all for unmatched routes -> 404 JSON error.
 */
module.exports = function notFound(req, _res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};
