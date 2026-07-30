const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  getAgents,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.get('/agents', protect, authorize('Manager'), getAgents);

module.exports = router;
