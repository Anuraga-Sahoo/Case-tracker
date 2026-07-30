const express = require('express');
const router = express.Router();
const { addComment } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/:caseId', protect, addComment);

module.exports = router;
