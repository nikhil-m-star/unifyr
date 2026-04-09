const express = require('express');
const { submitFeedback, getAllFeedback, deleteFeedback } = require('../controllers/feedbackController');
const { protect, requireAuthentication, syncUser, isAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

// Any authenticated user can submit feedback
router.post('/', protect, requireAuthentication, syncUser, submitFeedback);

// Only admins can view and delete feedback
router.get('/', protect, requireAuthentication, syncUser, isAdmin, getAllFeedback);
router.delete('/:id', protect, requireAuthentication, syncUser, isAdmin, deleteFeedback);

module.exports = router;
