'use strict';

const express = require('express');
const { apiLimiter } = require('../middleware/rateLimiter');

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const taskRoutes = require('./task.routes');
const docsRoutes = require('./docs.routes');
const metricsRoutes = require('./metrics.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/metrics', metricsRoutes);
router.use('/docs', docsRoutes);

router.use('/api/auth', apiLimiter, authRoutes);
router.use('/api/tasks', apiLimiter, taskRoutes);

/**
 * @openapi
 * /api/data:
 *   get:
 *     summary: Legacy sample endpoint (kept for backwards compatibility)
 *     tags: [Legacy]
 *     deprecated: true
 *     responses:
 *       200: { description: Sample payload }
 */
router.get('/api/data', apiLimiter, (req, res) => {
  res.json({
    message: 'Hello from the backend service!',
    version: process.env.SERVICE_VERSION || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
