const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Dedicated Role-Based Registration endpoints
router.post('/register/student', authController.registerStudent);
router.post('/register/company', authController.registerCompany);
router.post('/register', authController.register); // Unified fallback

// Authentication & Profile verification
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
