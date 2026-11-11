'use strict';

const errorHandler = require('../../src/middleware/errorHandler');
const { normalizePrismaError } = errorHandler;
const {
  BadRequestError,
  ValidationError,
  NotFoundError
} = require('../../src/utils/errors');

function mockRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
}

describe('errorHandler middleware', () => {
  test('serializes an operational AppError', () => {
    const res = mockRes();
    errorHandler(new BadRequestError('bad input'), { id: 'req-1' }, res, jest.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'BAD_REQUEST', message: 'bad input', requestId: 'req-1' });
  });

  test('includes validation details', () => {
    const res = mockRes();
    const err = new ValidationError('failed', [{ field: 'title', message: 'required' }]);
    errorHandler(err, { id: 'req-2' }, res, jest.fn());
    expect(res.statusCode).toBe(422);
    expect(res.body.error.details).toHaveLength(1);
  });

  test('maps Prisma P2002 to 409', () => {
    const res = mockRes();
    errorHandler({ code: 'P2002' }, { id: 'r' }, res, jest.fn());
    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('maps Prisma P2025 to 404 and P2003 to 400', () => {
    const res1 = mockRes();
    errorHandler({ code: 'P2025' }, { id: 'r' }, res1, jest.fn());
    expect(res1.statusCode).toBe(404);

    const res2 = mockRes();
    errorHandler({ code: 'P2003' }, { id: 'r' }, res2, jest.fn());
    expect(res2.statusCode).toBe(400);
  });

  test('hides internal messages for unexpected 500 errors', () => {
    const res = mockRes();
    errorHandler(new Error('database exploded with secrets'), { id: 'r' }, res, jest.fn());
    expect(res.statusCode).toBe(500);
    expect(res.body.error.message).toBe('Internal server error');
  });

  test('normalizePrismaError returns null for non-prisma errors', () => {
    expect(normalizePrismaError(new Error('x'))).toBeNull();
    expect(normalizePrismaError({ code: 'ZZZ' })).toBeNull();
  });

  test('normalizePrismaError passes through a NotFoundError to the 4xx path', () => {
    const res = mockRes();
    errorHandler(new NotFoundError('Task not found'), { id: 'r' }, res, jest.fn());
    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toBe('Task not found');
  });
});
