const teamModel = require('../models/teamModel');
const joinRequestModel = require('../models/joinRequestModel');

const createTeam = async (req, res) => {
  try {
    const { eventId, eventName, teamName, description, lookingFor } = req.body;
    const creatorId = req.dbUser.id;

    const newTeam = await teamModel.createTeam(eventId, eventName, creatorId, teamName, description, lookingFor);
    res.status(201).json({ message: 'Team created successfully', team: newTeam });
  } catch (error) {
    console.error('Create Team Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getEventTeams = async (req, res) => {
  try {
    const { eventId } = req.params;
    const teams = await teamModel.getTeamsByEvent(eventId);
    res.status(200).json(teams);
  } catch (error) {
    console.error('Get Event Teams Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllTeams = async (req, res) => {
  try {
    const teams = await teamModel.getAllTeams();
    res.status(200).json(teams);
  } catch (error) {
    console.error('Get All Teams Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getMyTeams = async (req, res) => {
  try {
    const teams = await teamModel.getTeamsByCreator(req.dbUser.id);
    const teamsWithRequests = await Promise.all(
      teams.map(async (team) => ({
        ...team,
        requests: await joinRequestModel.getRequestsByTeam(team.id),
      })),
    );
    res.status(200).json(teamsWithRequests);
  } catch (error) {
    console.error('Get My Teams Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const createJoinRequest = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { pitch } = req.body;
    const senderId = req.dbUser.id;
    const team = await teamModel.getTeamById(teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.creator_id === senderId) {
      return res.status(400).json({ message: 'You cannot send a pitch to your own teammate post.' });
    }

    if (team.status !== 'open') {
      return res.status(400).json({ message: 'This teammate post is no longer accepting pitches.' });
    }

    const existingPendingRequest = await joinRequestModel.getPendingRequestByTeamAndSender(teamId, senderId);
    if (existingPendingRequest) {
      return res.status(400).json({ message: 'You already have a pending pitch for this teammate post.' });
    }

    const request = await joinRequestModel.createJoinRequest(teamId, senderId, pitch);
    res.status(201).json({ message: 'Join request sent', request });
  } catch (error) {
    console.error('Create Join Request Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const processJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'
    const userId = req.dbUser.id;

    const request = await joinRequestModel.getRequestById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const team = await teamModel.getTeamById(request.team_id);
    if (!team || team.creator_id !== userId) {
      return res.status(403).json({ message: 'Only team creator can process requests' });
    }

    const updatedRequest = await joinRequestModel.updateRequestStatus(requestId, status);
    res.status(200).json({ message: `Request ${status}`, request: updatedRequest });
  } catch (error) {
    console.error('Process Request Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateMyTeamStatus = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status } = req.body;
    const team = await teamModel.getTeamById(teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.creator_id !== req.dbUser.id) {
      return res.status(403).json({ message: 'Only the creator can manage this teammate post.' });
    }

    const updatedTeam = await teamModel.updateTeamStatus(teamId, status);
    res.status(200).json({ message: 'Teammate post updated', team: updatedTeam });
  } catch (error) {
    console.error('Update Team Status Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteMyTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await teamModel.getTeamById(teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.creator_id !== req.dbUser.id) {
      return res.status(403).json({ message: 'Only the creator can delete this teammate post.' });
    }

    await teamModel.deleteTeam(teamId);
    res.status(200).json({ message: 'Teammate post deleted' });
  } catch (error) {
    console.error('Delete Team Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createTeam,
  getEventTeams,
  getAllTeams,
  getMyTeams,
  createJoinRequest,
  processJoinRequest,
  updateMyTeamStatus,
  deleteMyTeam
};
