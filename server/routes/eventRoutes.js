const express = require('express');
const { createEvent, getEvents, deleteEvent } = require('../controllers/eventController');
const validateRequest = require('../middlewares/validateRequest');
const { createEventSchema } = require('../validators/eventValidators');
const { protect, requireAuthentication, syncUser, isAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public route for students to see events
router.get('/', getEvents);

// Admin only routes
router.post('/', protect, requireAuthentication, syncUser, isAdmin, validateRequest(createEventSchema), createEvent);
router.delete('/:id', protect, requireAuthentication, syncUser, isAdmin, deleteEvent);

module.exports = router;
