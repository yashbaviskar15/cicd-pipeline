'use strict';

const client = require('prom-client');
const config = require('./config');

/**
 * Prometheus metrics registry. All application metrics are registered on a
 * private registry (rather than the global default) so that tests can reset
 * it deterministically and so the /metrics payload only contains metrics we
 * explicitly care about.
 */
const registry = new client.Registry();
registry.setDefaultLabels({ service: 'cicd-backend' });

if (config.metricsEnabled) {
  client.collectDefaultMetrics({ register: registry, prefix: 'nodejs_' });
}

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.3, 0.5, 1, 2.5, 5],
  registers: [registry]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry]
});

const httpErrorsTotal = new client.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP requests that resulted in an error (5xx)',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry]
});

const httpActiveRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of in-flight HTTP requests',
  registers: [registry]
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [registry]
});

// Business metric: tasks created since process start.
const tasksCreatedTotal = new client.Counter({
  name: 'tasks_created_total',
  help: 'Total number of tasks created',
  registers: [registry]
});

const tasksTotal = new client.Gauge({
  name: 'tasks_records_total',
  help: 'Current number of task records by status',
  labelNames: ['status'],
  registers: [registry]
});

/**
 * Time a database operation and record it in the db_query_duration histogram.
 *
 * @template T
 * @param {string} operation logical operation name (e.g. "task.create")
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function timeQuery(operation, fn) {
  const end = dbQueryDuration.startTimer({ operation });
  try {
    return await fn();
  } finally {
    end();
  }
}

/** Reset the registry; used by tests. */
function reset() {
  registry.resetMetrics();
}

module.exports = {
  registry,
  httpRequestDuration,
  httpRequestsTotal,
  httpErrorsTotal,
  httpActiveRequests,
  dbQueryDuration,
  tasksCreatedTotal,
  tasksTotal,
  timeQuery,
  reset
};
