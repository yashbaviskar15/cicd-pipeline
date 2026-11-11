'use strict';

const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  ServiceUnavailableError
} = require('../../src/utils/errors');

describe('error classes', () => {
  const cases = [
    [BadRequestError, 400, 'BAD_REQUEST'],
    [UnauthorizedError, 401, 'UNAUTHORIZED'],
    [ForbiddenError, 403, 'FORBIDDEN'],
    [NotFoundError, 404, 'NOT_FOUND'],
    [ConflictError, 409, 'CONFLICT'],
    [ValidationError, 422, 'VALIDATION_ERROR'],
    [ServiceUnavailableError, 503, 'SERVICE_UNAVAILABLE']
  ];

  test.each(cases)('%p maps to status %i and code %s', (ErrorClass, status, code) => {
    const err = new ErrorClass();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(status);
    expect(err.code).toBe(code);
    expect(err.isOperational).toBe(true);
  });

  test('AppError defaults', () => {
    const err = new AppError('boom');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.details).toBeUndefined();
  });

  test('ValidationError carries details', () => {
    const details = [{ field: 'title', message: 'required' }];
    expect(new ValidationError('nope', details).details).toEqual(details);
  });

  test('exposes a stable name', () => {
    expect(new NotFoundError().name).toBe('NotFoundError');
  });
});
