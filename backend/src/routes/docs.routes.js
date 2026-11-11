'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const spec = require('../openapi');

const router = express.Router();

// Raw spec (useful for codegen / contract testing).
router.get('/openapi.json', (req, res) => res.json(spec));

// Interactive Swagger UI at /docs
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(spec, { customSiteTitle: 'CICD Backend API Docs' }));

module.exports = router;
