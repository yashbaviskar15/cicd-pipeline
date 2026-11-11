'use strict';

const prisma = require('../db/prisma');

/**
 * Build a Prisma `where` clause from list filters.
 *
 * @param {string} userId
 * @param {{status?: string, priority?: string, search?: string}} filters
 */
function buildWhere(userId, { status, priority, search } = {}) {
  const where = { userId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }
  return where;
}

/**
 * @param {object} data
 */
async function create(data) {
  return prisma.task.create({ data });
}

/**
 * @param {string} id
 */
async function findById(id) {
  return prisma.task.findUnique({ where: { id } });
}

/**
 * @param {string} userId
 * @param {object} options
 */
async function findManyByUser(userId, { status, priority, search, skip = 0, take = 20, orderBy } = {}) {
  return prisma.task.findMany({
    where: buildWhere(userId, { status, priority, search }),
    orderBy: orderBy || { createdAt: 'desc' },
    skip,
    take
  });
}

/**
 * @param {string} userId
 * @param {object} filters
 */
async function countByUser(userId, { status, priority, search } = {}) {
  return prisma.task.count({ where: buildWhere(userId, { status, priority, search }) });
}

/**
 * @param {string} userId
 */
async function statusCounts(userId) {
  const grouped = await prisma.task.groupBy({
    by: ['status'],
    where: { userId },
    _count: { _all: true }
  });
  return grouped.reduce((acc, row) => {
    acc[row.status] = row._count._all;
    return acc;
  }, {});
}

/**
 * @param {string} id
 * @param {object} data
 */
async function update(id, data) {
  return prisma.task.update({ where: { id }, data });
}

/**
 * @param {string} id
 */
async function remove(id) {
  return prisma.task.delete({ where: { id } });
}

module.exports = {
  buildWhere,
  create,
  findById,
  findManyByUser,
  countByUser,
  statusCounts,
  update,
  remove
};
