const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Track server start time for uptime calculation
const startTime = Date.now();

app.use(cors());
app.use(express.json());

// Root endpoint - service overview
app.get('/', (req, res) => {
  res.json({
    service: 'cicd-backend',
    status: 'healthy',
    version: process.env.VERSION || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    endpoints: [
      { method: 'GET', path: '/', description: 'Service overview' },
      { method: 'GET', path: '/health', description: 'Health check' },
      { method: 'GET', path: '/api/data', description: 'Sample data' }
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'backend',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Data endpoint
app.get('/api/data', (req, res) => {
  res.json({
    message: 'Hello from the backend service!',
    version: process.env.VERSION || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend service running on port ${port}`);
  });
}

module.exports = app;
