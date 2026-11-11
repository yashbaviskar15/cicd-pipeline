'use strict';

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const metrics = require('../metrics');

const router = express.Router();

/**
 * @openapi
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags: [Observability]
 *     responses:
 *       200: { description: Prometheus exposition format }
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.setHeader('Content-Type', metrics.registry.contentType);
    const body = await metrics.registry.metrics();
    res.end(body);
  })
);

module.exports = router;
