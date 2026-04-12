const express = require('express');
const { protect, requireAuthentication, syncUser } = require('../middlewares/authMiddleware');
const { submitProfile, getProfile, respondToMatch } = require('../controllers/wordConnectController');

const router = express.Router();

router.post('/submit', protect, requireAuthentication, syncUser, submitProfile);
router.get('/profile', protect, requireAuthentication, syncUser, getProfile);
router.post('/respond', protect, requireAuthentication, syncUser, respondToMatch);

module.exports = router;
