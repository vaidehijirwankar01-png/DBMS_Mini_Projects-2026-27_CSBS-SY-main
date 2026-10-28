const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public/student company view
router.get('/', companyController.getAllCompanies);
router.get('/profile', authMiddleware, roleMiddleware('company'), companyController.getProfile);
router.put('/profile', authMiddleware, roleMiddleware('company'), companyController.updateProfile);

// Company recruiter operations
router.get('/drives', authMiddleware, roleMiddleware('company'), companyController.getCompanyDrives);
router.get('/applicants', authMiddleware, roleMiddleware('company'), companyController.getApplicants);
router.put('/applicants/:application_id/status', authMiddleware, roleMiddleware('company'), companyController.updateApplicantStatus);
router.get('/selections', authMiddleware, roleMiddleware('company'), companyController.getSelectionResults);

router.get('/:id', companyController.getCompanyById);

module.exports = router;
