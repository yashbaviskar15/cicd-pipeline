'use strict';

const metrics = require('../metrics');

/**
 * Record RED (Rate, Errors, Duration) metrics for every request.
 *
 * The `route` label uses the matched route pattern (e.g. `/api/tasks/:id`)
 * rather than the raw path to avoid unbounded label cardinality.
 */
function metricsMiddleware(req, res, next) {
  metrics.httpActiveRequests.inc();
  const end = metrics.httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = (req.baseUrl || '') + ((req.route && req.route.path) || req.path || 'unknown');
    const labels = {
      method: req.method,
      route: route === '' ? '/' : route,
      status_code: res.statusCode
    };
    metrics.httpActiveRequests.dec();
    metrics.httpRequestsTotal.inc(labels);
    if (res.statusCode >= 500) {
      metrics.httpErrorsTotal.inc(labels);
    }
    end(labels);
  });

  next();
}

module.exports = metricsMiddleware;
