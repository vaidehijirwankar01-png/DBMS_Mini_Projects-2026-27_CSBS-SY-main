// =====================================================================
// Express Server (server.js)
// Hotel Management System - DBMS Mini Project
// Serves REST API and static frontend assets
// =====================================================================

require('dotenv').config();
const path = require('path');
const express = require('express');

const roomsRouter = require('./routes/rooms');
const customersRouter = require('./routes/customers');
const employeesRouter = require('./routes/employees');
const bookingsRouter = require('./routes/bookings');
const paymentsRouter = require('./routes/payments');
const dashboardRouter = require('./routes/dashboard');
const reportsRouter = require('./routes/reports');
const logsRouter = require('./routes/logs');
const feedbackRouter = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/rooms', roomsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/feedback', feedbackRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    service: 'Hotel Management System API'
  });
});

// Server Stop Endpoint (for 1-click Stop button in UI)
app.post('/api/server/stop', (req, res) => {
  res.json({ success: true, message: 'Server is stopping. You can close this tab.' });
  console.log('[Server]: Shutdown initiated via UI button.');
  setTimeout(() => {
    process.exit(0);
  }, 600);
});

// Central Error Handling Middleware
// Intercepts MySQL SIGNAL messages, constraint violations, and MongoDB errors
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);

  let statusCode = 400;
  let errorMessage = err.message || 'An unexpected server error occurred.';

  // Handle MySQL Custom SIGNAL (SQLSTATE 45000)
  if (err.sqlState === '45000') {
    statusCode = 400;
    errorMessage = err.sqlMessage || err.message;
  }
  // Handle Duplicate Key violation (ER_DUP_ENTRY)
  else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    errorMessage = 'Duplicate record: A unique constraint was violated (e.g. Email or Aadhaar already registered).';
  }
  // Handle Foreign Key violation (ER_ROW_IS_REFERENCED_2 / ER_NO_REFERENCED_ROW_2)
  else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 400;
    errorMessage = 'Cannot delete or alter: This record is linked to existing bookings or payments.';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    errorMessage = 'Invalid reference: The referenced parent record does not exist.';
  }
  // Handle Check Constraint violation
  else if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    statusCode = 400;
    errorMessage = 'Validation error: Check constraint violated (e.g. invalid date range or negative values).';
  } else if (!err.sqlState && !err.code) {
    statusCode = 500;
  }

  res.status(statusCode).json({
    success: false,
    error: errorMessage
  });
});

// Fallback to index.html for single-page routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Hotel Management System is running!`);
  console.log(`  Local URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});

module.exports = { app, server };
