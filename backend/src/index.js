'use strict';

// Tracing must be initialised before any instrumented module is imported.
require('./tracing');

const http = require('http');
const config = require('./config');
const logger = require('./logger');
const createApp = require('./app');
const prisma = require('./db/prisma');

const app = createApp();

let server = null;

/**
 * Graceful shutdown:
 *  1. stop accepting new connections (server.close)
 *  2. drain in-flight requests
 *  3. close the database connection pool
 *  4. exit
 * A hard 10s deadline guarantees the container always terminates so ECS/K8s
 * do not have to SIGKILL us.
 *
 * @param {string} signal
 */
function shutdown(signal) {
  logger.info({ signal }, 'Received shutdown signal, draining connections...');

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error while closing HTTP server');
    }
    try {
      await prisma.disconnect();
      logger.info('Database connection closed');
    } catch (dbErr) {
      logger.error({ err: dbErr }, 'Error closing database connection');
    }
    clearTimeout(forceExit);
    logger.info('Shutdown complete');
    process.exit(err ? 1 : 0);
  });
}

if (require.main === module) {
  server = http.createServer(app);

  server.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.env, version: config.serviceVersion },
      'Backend service started'
    );
  });

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception, exiting');
    shutdown('uncaughtException');
  });
}

// Exported for tests and for Vercel's serverless handler.
module.exports = app;
