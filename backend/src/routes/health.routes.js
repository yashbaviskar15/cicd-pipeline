'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const prisma = require('../db/prisma');
const config = require('../config');
const logger = require('../logger');

const router = express.Router();
const startedAt = Date.now();

function uptimeSeconds() {
  return Math.floor((Date.now() - startedAt) / 1000);
}

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness probe
 *     tags: [Health]
 *     responses:
 *       200: { description: Service is healthy }
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'backend',
    version: config.serviceVersion,
    uptime: uptimeSeconds(),
    environment: config.env
  });
});

/** Kubernetes liveness probe: process is up and event loop responsive. */
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive', uptime: uptimeSeconds() });
});

/** Kubernetes/ALB readiness probe: dependencies (database) reachable. */
router.get(
  '/ready',
  asyncHandler(async (req, res) => {
    const checks = { database: 'up' };
    try {
      await prisma.ping();
    } catch (err) {
      checks.database = 'down';
      logger.error({ err, requestId: req.id }, 'Readiness check failed');
      return res.status(503).json({
        status: 'not-ready',
        checks,
        timestamp: new Date().toISOString()
      });
    }
    return res.json({ status: 'ready', checks, timestamp: new Date().toISOString() });
  })
);

module.exports = router;
