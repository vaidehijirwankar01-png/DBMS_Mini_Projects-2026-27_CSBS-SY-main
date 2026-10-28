const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Student applies
router.post('/', authMiddleware, roleMiddleware('student'), applicationController.applyForDrive);

// Get applications by student
router.get('/student/:studentId', authMiddleware, applicationController.getApplicationsByStudent);

// Get applications by drive (company or admin)
router.get('/drive/:driveId', authMiddleware, roleMiddleware('company', 'admin'), applicationController.getApplicationsByDrive);

// Update status (company or admin)
router.put('/:id/status', authMiddleware, roleMiddleware('company', 'admin'), applicationController.updateStatus);

module.exports = router;
