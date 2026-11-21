'use strict';

// Vercel serverless entry point.
require('../src/tracing');

const createApp = require('../src/app');
const app = createApp();

module.exports = app;