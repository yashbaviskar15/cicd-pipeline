'use strict';

const { PrismaClient } = require('@prisma/client');
const logger = require('../logger');

/**
 * Single shared Prisma client instance.
 *
 * A new client must NOT be created per request: each client owns a database
 * connection pool. Controllers/services import this module instead.
 */
const prisma = new PrismaClient({
  log: logger.level === 'debug' || logger.level === 'trace'
    ? [{ emit: 'event', level: 'query' }]
    : []
});

/**
 * Lightweight connectivity probe used by the readiness endpoint.
 *
 * @returns {Promise<boolean>}
 */
async function ping() {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}

/**
 * Gracefully close the connection pool during shutdown.
 *
 * @returns {Promise<void>}
 */
async function disconnect() {
  await prisma.$disconnect();
}

module.exports = prisma;
module.exports.ping = ping;
module.exports.disconnect = disconnect;
