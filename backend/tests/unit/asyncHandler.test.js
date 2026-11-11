'use strict';

const asyncHandler = require('../../src/utils/asyncHandler');

describe('asyncHandler', () => {
  test('resolves without calling next', async () => {
    const next = jest.fn();
    const handler = asyncHandler(async (req, res) => {
      res.sent = true;
    });
    const res = {};
    await handler({}, res, next);
    expect(res.sent).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  test('forwards rejections to next', async () => {
    const next = jest.fn();
    const error = new Error('async failure');
    const handler = asyncHandler(async () => {
      throw error;
    });
    handler({}, {}, next);
    await new Promise((resolve) => setImmediate(resolve));
    expect(next).toHaveBeenCalledWith(error);
  });
});
