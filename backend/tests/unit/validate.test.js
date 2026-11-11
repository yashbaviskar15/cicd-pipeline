'use strict';

const validate = require('../../src/middleware/validate');
const { createTaskSchema } = require('../../src/schemas/task.schemas');
const { listTasksQuerySchema } = require('../../src/schemas/task.schemas');
const { ValidationError } = require('../../src/utils/errors');

const res = {};

describe('validate middleware', () => {
  test('parses and replaces the body, calling next with no args', () => {
    const next = jest.fn();
    const req = { body: { title: '  Hello world  ' } };

    validate({ body: createTaskSchema })(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body.title).toBe('Hello world');
  });

  test('forwards a ValidationError with field details for invalid bodies', () => {
    const next = jest.fn();
    const req = { body: { title: '' } };

    validate({ body: createTaskSchema })(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details[0].field).toBe('title');
  });

  test('coerces and stores validated query on req.validatedQuery', () => {
    const next = jest.fn();
    const req = { query: { page: '3', limit: '5' } };

    validate({ query: listTasksQuerySchema })(req, res, next);

    expect(req.validatedQuery).toEqual({ page: 3, limit: 5 });
    expect(req.query).toEqual({ page: '3', limit: '5' });
  });

  test('does nothing when no schema is supplied for a key', () => {
    const next = jest.fn();
    const req = { body: { anything: true } };
    validate({})(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ anything: true });
  });
});
