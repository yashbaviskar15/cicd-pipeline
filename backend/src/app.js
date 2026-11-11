'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const config = require('./config');
const requestLogger = require('./middleware/requestLogger');
const metricsMiddleware = require('./middleware/metrics');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const routes = require('./routes');

const startedAt = Date.now();

/**
 * Endpoint directory exposed on the service root, consumed by the frontend
 * dashboard's API explorer.
 */
const ENDPOINTS = [
  { method: 'GET', path: '/', description: 'Service overview' },
  { method: 'GET', path: '/health', description: 'Health check' },
  { method: 'GET', path: '/health/ready', description: 'Readiness (database) check' },
  { method: 'GET', path: '/metrics', description: 'Prometheus metrics' },
  { method: 'GET', path: '/docs', description: 'Swagger API documentation' },
  { method: 'POST', path: '/api/auth/register', description: 'Register a user' },
  { method: 'POST', path: '/api/auth/login', description: 'Log in' },
  { method: 'GET', path: '/api/tasks', description: 'List tasks' },
  { method: 'POST', path: '/api/tasks', description: 'Create a task' },
  { method: 'GET', path: '/api/data', description: 'Legacy sample data' }
];

function rootHandler(req, res) {
  res.json({
    service: 'cicd-backend',
    status: 'healthy',
    version: config.serviceVersion,
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    environment: config.env,
    endpoints: ENDPOINTS
  });
}

/**
 * Build and configure the Express application.
 *
 * Kept separate from `index.js` (the server bootstrap) so the app can be
 * imported directly in tests with supertest, without opening a port.
 *
 * @returns {import('express').Express}
 */
function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  // Security headers. Swagger UI needs a relaxed CSP to load its assets.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: config.corsOrigin !== '*'
    })
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  app.use(requestLogger);
  app.use(metricsMiddleware);

  app.get('/', rootHandler);
  app.use(routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
module.exports.ENDPOINTS = ENDPOINTS;
