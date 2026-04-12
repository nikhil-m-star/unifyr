const express = require('express');
const { getSessionMessages, getUserSessions, deleteSession, deleteMessage, getPendingOfflineMessages, startDirectChat } = require('../controllers/chatController');
const { protect, requireAuthentication, syncUser } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, requireAuthentication, syncUser, getUserSessions);
router.get('/pending/offline', protect, requireAuthentication, syncUser, getPendingOfflineMessages);
router.post('/direct/:userId', protect, requireAuthentication, syncUser, startDirectChat);
router.get('/:sessionId/messages', protect, requireAuthentication, syncUser, getSessionMessages);
router.delete('/:sessionId', protect, requireAuthentication, syncUser, deleteSession);
router.delete('/:sessionId/messages/:messageId', protect, requireAuthentication, syncUser, deleteMessage);

module.exports = router;
