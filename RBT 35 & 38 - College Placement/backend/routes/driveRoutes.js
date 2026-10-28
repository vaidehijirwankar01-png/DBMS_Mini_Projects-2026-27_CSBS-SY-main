const express = require('express');
const router = express.Router();
const driveController = require('../controllers/driveController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public or logged-in users can browse drives
router.get('/', driveController.getAllDrives);
router.get('/:id', driveController.getDriveById);

// Company & Admin can create/update/delete drives
router.post('/', authMiddleware, roleMiddleware('company', 'admin'), driveController.createDrive);
router.put('/:id', authMiddleware, roleMiddleware('company', 'admin'), driveController.updateDrive);
router.delete('/:id', authMiddleware, roleMiddleware('company', 'admin'), driveController.deleteDrive);

module.exports = router;
