'use strict';

jest.mock('../../src/db/prisma', () => ({
  user: { create: jest.fn(), findUnique: jest.fn() },
  task: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

const prisma = require('../../src/db/prisma');
const userRepository = require('../../src/repositories/userRepository');
const taskRepository = require('../../src/repositories/taskRepository');

describe('userRepository', () => {
  test('create delegates to prisma', async () => {
    prisma.user.create.mockResolvedValue({ id: 'u1' });
    const result = await userRepository.create({ email: 'a@b.com', name: 'A', password: 'h' });
    expect(result).toEqual({ id: 'u1' });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'a@b.com', name: 'A', password: 'h' }
    });
  });

  test('findByEmail and findById query by the right key', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await userRepository.findByEmail('a@b.com');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });

    await userRepository.findById('u1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });
});

describe('taskRepository', () => {
  test('buildWhere handles no filters', () => {
    expect(taskRepository.buildWhere('u1')).toEqual({ userId: 'u1' });
  });

  test('buildWhere includes status, priority and search', () => {
    const where = taskRepository.buildWhere('u1', {
      status: 'todo',
      priority: 'high',
      search: 'abc'
    });
    expect(where.userId).toBe('u1');
    expect(where.status).toBe('todo');
    expect(where.priority).toBe('high');
    expect(where.OR).toHaveLength(2);
  });

  test('create delegates to prisma', async () => {
    prisma.task.create.mockResolvedValue({ id: 't1' });
    await taskRepository.create({ title: 'x', userId: 'u1' });
    expect(prisma.task.create).toHaveBeenCalledWith({ data: { title: 'x', userId: 'u1' } });
  });

  test('findManyByUser applies pagination and ordering', async () => {
    prisma.task.findMany.mockResolvedValue([{ id: 't1' }]);
    await taskRepository.findManyByUser('u1', { skip: 0, take: 10, status: 'todo' });
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', status: 'todo' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    );
  });

  test('countByUser passes the filter', async () => {
    prisma.task.count.mockResolvedValue(7);
    const total = await taskRepository.countByUser('u1', { priority: 'low' });
    expect(total).toBe(7);
    expect(prisma.task.count).toHaveBeenCalledWith({ where: { userId: 'u1', priority: 'low' } });
  });

  test('statusCounts reduces the groupBy result', async () => {
    prisma.task.groupBy.mockResolvedValue([
      { status: 'todo', _count: { _all: 4 } },
      { status: 'done', _count: { _all: 1 } }
    ]);
    const counts = await taskRepository.statusCounts('u1');
    expect(counts).toEqual({ todo: 4, done: 1 });
  });

  test('update and remove delegate to prisma', async () => {
    prisma.task.update.mockResolvedValue({ id: 't1' });
    prisma.task.delete.mockResolvedValue({ id: 't1' });

    await taskRepository.update('t1', { title: 'new' });
    expect(prisma.task.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { title: 'new' } });

    await taskRepository.remove('t1');
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  test('findById delegates to prisma', async () => {
    prisma.task.findUnique.mockResolvedValue({ id: 't1' });
    await taskRepository.findById('t1');
    expect(prisma.task.findUnique).toHaveBeenCalledWith({ where: { id: 't1' } });
  });
});
