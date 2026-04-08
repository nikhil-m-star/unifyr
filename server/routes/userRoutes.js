const express = require('express');
const { getActiveUsers, getMe } = require('../controllers/userController');
const { protect, requireAuthentication, syncUser } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/active', protect, requireAuthentication, syncUser, getActiveUsers);
router.get('/me', protect, requireAuthentication, syncUser, getMe);

module.exports = router;
