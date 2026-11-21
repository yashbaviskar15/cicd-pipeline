'use strict';

// Vercel serverless entry point.
// In serverless the runtime does NOT call server.listen(); we just export the
// Express app and Vercel invokes it per request. The long-running container
// entry point (ECS / Docker / local) remains src/index.js.

require('../src/tracing');

const createApp = require('../src/app');

const app = createApp();

module.exports = app;
