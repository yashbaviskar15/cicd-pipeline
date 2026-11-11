'use strict';

jest.mock('../../src/repositories/userRepository');

const userRepository = require('../../src/repositories/userRepository');
const authService = require('../../src/services/authService');
const { hashPassword } = require('../../src/utils/password');
const { signRefreshToken } = require('../../src/utils/tokens');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../../src/utils/errors');

const storedUser = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Ada',
  role: 'user',
  password: 'stored-hash',
  createdAt: new Date('2024-01-01T00:00:00.000Z')
};

describe('authService', () => {
  test('register hashes the password and returns a token pair', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(storedUser);

    const result = await authService.register({
      email: 'a@b.com',
      name: 'Ada',
      password: 'password123'
    });

    expect(result.user).toEqual({
      id: 'u1',
      email: 'a@b.com',
      name: 'Ada',
      role: 'user',
      createdAt: storedUser.createdAt
    });
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.tokenType).toBe('Bearer');

    const createArgs = userRepository.create.mock.calls[0][0];
    expect(createArgs.password).not.toBe('password123');
    expect(createArgs.role).toBe('user');
  });

  test('register rejects a duplicate email', async () => {
    userRepository.findByEmail.mockResolvedValue(storedUser);
    await expect(
      authService.register({ email: 'a@b.com', name: 'Ada', password: 'password123' })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test('login succeeds with correct credentials', async () => {
    const password = await hashPassword('password123');
    userRepository.findByEmail.mockResolvedValue({ ...storedUser, password });

    const result = await authService.login({ email: 'a@b.com', password: 'password123' });
    expect(result.user.id).toBe('u1');
    expect(result.accessToken).toEqual(expect.any(String));
  });

  test('login rejects an unknown user', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    await expect(
      authService.login({ email: 'nobody@b.com', password: 'password123' })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('login rejects a wrong password', async () => {
    const password = await hashPassword('password123');
    userRepository.findByEmail.mockResolvedValue({ ...storedUser, password });
    await expect(
      authService.login({ email: 'a@b.com', password: 'wrong-password' })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('refresh issues a new token pair', async () => {
    userRepository.findById.mockResolvedValue(storedUser);
    const token = signRefreshToken({ sub: 'u1' });
    const result = await authService.refresh(token);
    expect(result.user.id).toBe('u1');
    expect(result.accessToken).toEqual(expect.any(String));
  });

  test('refresh rejects when the user no longer exists', async () => {
    userRepository.findById.mockResolvedValue(null);
    const token = signRefreshToken({ sub: 'ghost' });
    await expect(authService.refresh(token)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('me returns the public profile', async () => {
    userRepository.findById.mockResolvedValue(storedUser);
    const user = await authService.me('u1');
    expect(user).toEqual(expect.objectContaining({ id: 'u1', email: 'a@b.com' }));
    expect(user.password).toBeUndefined();
  });

  test('me rejects an unknown user', async () => {
    userRepository.findById.mockResolvedValue(null);
    await expect(authService.me('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
