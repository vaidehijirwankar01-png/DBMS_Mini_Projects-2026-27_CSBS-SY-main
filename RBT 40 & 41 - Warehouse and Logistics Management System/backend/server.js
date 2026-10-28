const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { testConnection } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount API Routes
app.use('/api/warehouses', require('./routes/warehouses'));
app.use('/api/products', require('./routes/products'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/carriers', require('./routes/carriers'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/track', require('./routes/tracking'));
app.use('/api/reports', require('./routes/reports'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Warehouse & Logistics Management API',
    timestamp: new Date()
  });
});

// Static frontend serving
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 Handler for unhandled API calls
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(` Logistics Management Full-Stack App running on port ${PORT}`);
  console.log(` http://localhost:${PORT}`);
  console.log(` http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
  await testConnection();
});
