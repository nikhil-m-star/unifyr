const express = require('express');
const { protect, requireAuthentication, syncUser } = require('../middlewares/authMiddleware');
const { recommendEvents } = require('../controllers/aiController');

const router = express.Router();

router.post('/recommend-events', protect, requireAuthentication, syncUser, recommendEvents);

module.exports = router;

