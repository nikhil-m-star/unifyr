const express = require('express');
const {
  createTeam,
  getEventTeams,
  getAllTeams,
  getMyTeams,
  createJoinRequest,
  processJoinRequest,
  updateMyTeamStatus,
  updateMyTeam,
  deleteMyTeam,
} = require('../controllers/teamController');
const validateRequest = require('../middlewares/validateRequest');
const { createTeamSchema, joinRequestSchema, processRequestSchema, updateTeamStatusSchema, updateTeamSchema } = require('../validators/teamValidators');
const { protect, requireAuthentication, syncUser } = require('../middlewares/authMiddleware');

const router = express.Router();

// Team endpoints
router.post('/', protect, requireAuthentication, syncUser, validateRequest(createTeamSchema), createTeam);
router.get('/', getAllTeams); 
router.get('/event/:eventId', getEventTeams);
router.get('/mine', protect, requireAuthentication, syncUser, getMyTeams);
router.patch('/:teamId/status', protect, requireAuthentication, syncUser, validateRequest(updateTeamStatusSchema), updateMyTeamStatus);
router.put('/:teamId', protect, requireAuthentication, syncUser, validateRequest(updateTeamSchema), updateMyTeam);
router.delete('/:teamId', protect, requireAuthentication, syncUser, deleteMyTeam);

// Join Requests endpoints
router.post('/:teamId/requests', protect, requireAuthentication, syncUser, validateRequest(joinRequestSchema), createJoinRequest);
router.patch('/requests/:requestId', protect, requireAuthentication, syncUser, validateRequest(processRequestSchema), processJoinRequest);

module.exports = router;
