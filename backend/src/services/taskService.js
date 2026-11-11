'use strict';

const taskRepository = require('../repositories/taskRepository');
const metrics = require('../metrics');
const { NotFoundError } = require('../utils/errors');

const STATUSES = ['todo', 'in_progress', 'done'];

/**
 * Shape a task for API responses (stable public contract, ISO dates handled
 * by JSON serialization).
 *
 * @param {object} task
 */
function toPublicTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}

/**
 * Fetch a task and assert ownership. A missing task and a task owned by
 * someone else both return 404 so we do not leak the existence of records.
 *
 * @param {string} userId
 * @param {string} taskId
 */
async function getOwnedOrThrow(userId, taskId) {
  const task = await metrics.timeQuery('task.findById', () => taskRepository.findById(taskId));
  if (!task || task.userId !== userId) {
    throw new NotFoundError('Task not found');
  }
  return task;
}

/**
 * @param {string} userId
 * @param {object} input validated task input
 */
async function createTask(userId, input) {
  const task = await metrics.timeQuery('task.create', () =>
    taskRepository.create({
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      userId
    })
  );
  metrics.tasksCreatedTotal.inc();
  return toPublicTask(task);
}

/**
 * @param {string} userId
 * @param {object} query validated list query
 */
async function listTasks(userId, query) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;
  const filters = { status: query.status, priority: query.priority, search: query.search };

  const [items, total] = await Promise.all([
    metrics.timeQuery('task.findMany', () =>
      taskRepository.findManyByUser(userId, { ...filters, skip, take: limit })
    ),
    metrics.timeQuery('task.count', () => taskRepository.countByUser(userId, filters))
  ]);

  return {
    items: items.map(toPublicTask),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit)
    }
  };
}

/**
 * @param {string} userId
 * @param {string} taskId
 */
async function getTask(userId, taskId) {
  const task = await getOwnedOrThrow(userId, taskId);
  return toPublicTask(task);
}

/**
 * @param {string} userId
 * @param {string} taskId
 * @param {object} input
 */
async function updateTask(userId, taskId, input) {
  await getOwnedOrThrow(userId, taskId);

  const data = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;

  const updated = await metrics.timeQuery('task.update', () => taskRepository.update(taskId, data));
  return toPublicTask(updated);
}

/**
 * @param {string} userId
 * @param {string} taskId
 */
async function deleteTask(userId, taskId) {
  await getOwnedOrThrow(userId, taskId);
  await metrics.timeQuery('task.delete', () => taskRepository.remove(taskId));
  return { id: taskId };
}

/**
 * Aggregate task counts by status, used by the dashboard "business metrics"
 * panel and exposed as the `tasks_records_total` Prometheus gauge.
 *
 * @param {string} userId
 */
async function getStats(userId) {
  const counts = await metrics.timeQuery('task.groupBy', () => taskRepository.statusCounts(userId));
  const byStatus = { todo: 0, in_progress: 0, done: 0, ...counts };

  STATUSES.forEach((status) => metrics.tasksTotal.set({ status }, byStatus[status]));

  return {
    total: STATUSES.reduce((sum, status) => sum + byStatus[status], 0),
    byStatus
  };
}

module.exports = {
  STATUSES,
  toPublicTask,
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  getStats
};
