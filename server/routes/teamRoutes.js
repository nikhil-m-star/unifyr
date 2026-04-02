const express = require('express');
const { createTeam, getEventTeams, getAllTeams, createJoinRequest, processJoinRequest } = require('../controllers/teamController');
const validateRequest = require('../middlewares/validateRequest');
const { createTeamSchema, joinRequestSchema, processRequestSchema } = require('../validators/teamValidators');
const { protect, requireAuthentication, syncUser } = require('../middlewares/authMiddleware');

const router = express.Router();

// Team endpoints
router.post('/', protect, requireAuthentication, syncUser, validateRequest(createTeamSchema), createTeam);
router.get('/', getAllTeams); 
router.get('/event/:eventId', getEventTeams);

// Join Requests endpoints
router.post('/:teamId/requests', protect, requireAuthentication, syncUser, validateRequest(joinRequestSchema), createJoinRequest);
router.patch('/requests/:requestId', protect, requireAuthentication, syncUser, validateRequest(processRequestSchema), processJoinRequest);

module.exports = router;
