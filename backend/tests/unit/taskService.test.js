'use strict';

jest.mock('../../src/repositories/taskRepository');

const taskRepository = require('../../src/repositories/taskRepository');
const taskService = require('../../src/services/taskService');
const { NotFoundError } = require('../../src/utils/errors');

const baseTask = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Write tests',
  description: null,
  status: 'todo',
  priority: 'medium',
  dueDate: null,
  userId: 'u1',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z')
};

describe('taskService', () => {
  test('createTask forwards fields and counts the business metric', async () => {
    taskRepository.create.mockResolvedValue(baseTask);

    const task = await taskService.createTask('u1', {
      title: 'Write tests',
      status: 'todo',
      priority: 'medium',
      dueDate: '2024-02-01T00:00:00.000Z'
    });

    expect(task).toEqual(expect.objectContaining({ id: baseTask.id, title: 'Write tests' }));
    const arg = taskRepository.create.mock.calls[0][0];
    expect(arg.userId).toBe('u1');
    expect(arg.dueDate).toBeInstanceOf(Date);
  });

  test('createTask defaults optional fields', async () => {
    taskRepository.create.mockResolvedValue(baseTask);
    await taskService.createTask('u1', { title: 'Minimal' });
    const arg = taskRepository.create.mock.calls[0][0];
    expect(arg.description).toBeNull();
    expect(arg.status).toBe('todo');
    expect(arg.priority).toBe('medium');
    expect(arg.dueDate).toBeNull();
  });

  test('listTasks paginates and maps items', async () => {
    taskRepository.findManyByUser.mockResolvedValue([baseTask]);
    taskRepository.countByUser.mockResolvedValue(21);

    const result = await taskService.listTasks('u1', { page: 2, limit: 20, status: 'todo' });

    expect(result.items).toHaveLength(1);
    expect(result.pagination).toEqual({ page: 2, limit: 20, total: 21, totalPages: 2 });
    expect(taskRepository.findManyByUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ skip: 20, take: 20, status: 'todo' })
    );
  });

  test('listTasks returns zero totalPages when empty', async () => {
    taskRepository.findManyByUser.mockResolvedValue([]);
    taskRepository.countByUser.mockResolvedValue(0);
    const result = await taskService.listTasks('u1', {});
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(20);
  });

  test('getTask returns an owned task', async () => {
    taskRepository.findById.mockResolvedValue(baseTask);
    const task = await taskService.getTask('u1', baseTask.id);
    expect(task.id).toBe(baseTask.id);
  });

  test('getTask throws NotFound for a missing task', async () => {
    taskRepository.findById.mockResolvedValue(null);
    await expect(taskService.getTask('u1', baseTask.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  test('getTask throws NotFound when the task belongs to another user', async () => {
    taskRepository.findById.mockResolvedValue({ ...baseTask, userId: 'someone-else' });
    await expect(taskService.getTask('u1', baseTask.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  test('updateTask patches provided fields only', async () => {
    taskRepository.findById.mockResolvedValue(baseTask);
    taskRepository.update.mockResolvedValue({ ...baseTask, title: 'Updated', status: 'done' });

    const task = await taskService.updateTask('u1', baseTask.id, { title: 'Updated', status: 'done' });
    expect(task.title).toBe('Updated');
    expect(taskRepository.update).toHaveBeenCalledWith(baseTask.id, { title: 'Updated', status: 'done' });
  });

  test('updateTask clears dueDate when null is supplied', async () => {
    taskRepository.findById.mockResolvedValue(baseTask);
    taskRepository.update.mockResolvedValue(baseTask);
    await taskService.updateTask('u1', baseTask.id, { dueDate: null });
    expect(taskRepository.update).toHaveBeenCalledWith(baseTask.id, { dueDate: null });
  });

  test('deleteTask removes an owned task', async () => {
    taskRepository.findById.mockResolvedValue(baseTask);
    taskRepository.remove.mockResolvedValue(baseTask);
    const result = await taskService.deleteTask('u1', baseTask.id);
    expect(result).toEqual({ id: baseTask.id });
    expect(taskRepository.remove).toHaveBeenCalledWith(baseTask.id);
  });

  test('deleteTask rejects an unowned task', async () => {
    taskRepository.findById.mockResolvedValue(null);
    await expect(taskService.deleteTask('u1', baseTask.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  test('getStats aggregates status counts with zero defaults', async () => {
    taskRepository.statusCounts.mockResolvedValue({ todo: 3, done: 2 });
    const stats = await taskService.getStats('u1');
    expect(stats).toEqual({ total: 5, byStatus: { todo: 3, in_progress: 0, done: 2 } });
  });
});
