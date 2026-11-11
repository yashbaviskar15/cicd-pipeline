'use strict';

const prisma = require('../db/prisma');

/**
 * Data-access layer for users. Keeping Prisma calls in one place makes the
 * services testable (they can be given a fake repository) and keeps SQL/ORM
 * concerns out of the HTTP layer.
 *
 * @param {{email: string, name: string, password: string, role?: string}} data
 */
async function create(data) {
  return prisma.user.create({ data });
}

/**
 * @param {string} email
 */
async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

/**
 * @param {string} id
 */
async function findById(id) {
  return prisma.user.findUnique({ where: { id } });
}

module.exports = { create, findByEmail, findById };
