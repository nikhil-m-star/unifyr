const express = require('express');
const { getSessionMessages, getUserSessions } = require('../controllers/chatController');
const { protect, requireAuthentication, syncUser } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, requireAuthentication, syncUser, getUserSessions);
router.get('/:sessionId/messages', protect, requireAuthentication, syncUser, getSessionMessages);

module.exports = router;
