const express = require('express');
const { getActiveUsers } = require('../controllers/userController');
const { protect, requireAuthentication, syncUser } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/active', protect, requireAuthentication, syncUser, getActiveUsers);

module.exports = router;
