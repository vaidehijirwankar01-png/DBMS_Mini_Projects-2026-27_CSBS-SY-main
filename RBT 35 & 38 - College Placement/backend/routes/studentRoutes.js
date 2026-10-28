const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/profile', authMiddleware, roleMiddleware('student'), studentController.getProfile);
router.put('/profile', authMiddleware, roleMiddleware('student'), studentController.updateProfile);
router.get('/drives', authMiddleware, roleMiddleware('student'), studentController.getEligibleDrives);
router.get('/applications', authMiddleware, roleMiddleware('student'), studentController.getStudentApplications);
router.get('/selections', authMiddleware, roleMiddleware('student'), studentController.getStudentSelections);

// Admin or General access
router.get('/', authMiddleware, roleMiddleware('admin'), studentController.getAllStudents);
router.get('/:id', authMiddleware, studentController.getStudentById);

module.exports = router;
