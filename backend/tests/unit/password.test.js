'use strict';

const { hashPassword, verifyPassword } = require('../../src/utils/password');

describe('password utils', () => {
  test('hashes and verifies a password', async () => {
    const hash = await hashPassword('supersecret123');
    expect(hash).not.toBe('supersecret123');
    expect(hash.startsWith('$2')).toBe(true);
    await expect(verifyPassword('supersecret123', hash)).resolves.toBe(true);
  });

  test('rejects a wrong password', async () => {
    const hash = await hashPassword('supersecret123');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});
