const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'backend'
  });
});

app.get('/api/data', (req, res) => {
  res.json({
    message: 'Hello from the backend service!',
    version: process.env.VERSION || '1.0.0'
  });
});

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend service running on port ${port}`);
  });
}

module.exports = app;
