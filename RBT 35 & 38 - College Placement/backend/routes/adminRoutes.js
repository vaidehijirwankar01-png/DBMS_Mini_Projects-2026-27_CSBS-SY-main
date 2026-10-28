const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All admin routes require admin role
router.use(authMiddleware, roleMiddleware('admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/students', adminController.getAllStudents);
router.get('/companies', adminController.getAllCompanies);
router.put('/companies/:id/status', adminController.updateCompanyStatus);
router.get('/applications', adminController.getAllApplications);
router.get('/selections', adminController.getAllSelections);
router.get('/departments', adminController.getDepartments);
router.post('/departments', adminController.createDepartment);
router.delete('/departments/:id', adminController.deleteDepartment);
router.get('/reports', adminController.getReports);

module.exports = router;
