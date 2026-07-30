const express = require('express');
const router = express.Router();
const {
  createCase,
  getCases,
  getCaseById,
  updateCaseStatus,
  updateCaseDetails,
} = require('../controllers/caseController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('Manager'), createCase);
router.get('/', protect, getCases);
router.get('/:id', protect, getCaseById);
router.put('/:id', protect, authorize('Manager'), updateCaseDetails);
router.put('/:id/status', protect, updateCaseStatus);

module.exports = router;
