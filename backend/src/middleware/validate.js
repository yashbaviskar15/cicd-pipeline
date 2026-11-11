'use strict';

const { ValidationError } = require('../utils/errors');

/**
 * Convert a ZodError into a compact, client friendly issue list.
 *
 * @param {import('zod').ZodError} error
 */
function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message
  }));
}

/**
 * Validation middleware factory.
 *
 * Usage: `router.post('/', validate({ body: createTaskSchema }), handler)`
 *
 * @param {{body?: object, params?: object, query?: object}} schemas
 * @returns {import('express').RequestHandler}
 */
function validate(schemas) {
  return function validateRequest(req, _res, next) {
    for (const key of ['body', 'params', 'query']) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        return next(new ValidationError('Request validation failed', formatIssues(result.error)));
      }
      // Replace the raw input with the parsed (coerced, trimmed) value.
      if (key === 'query') {
        req.validatedQuery = result.data;
      } else {
        req[key] = result.data;
      }
    }
    return next();
  };
}

module.exports = validate;
module.exports.formatIssues = formatIssues;
