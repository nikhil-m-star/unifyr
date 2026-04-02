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

const createJoinRequest = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { pitch } = req.body;
    const senderId = req.dbUser.id;

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

module.exports = {
  createTeam,
  getEventTeams,
  getAllTeams,
  createJoinRequest,
  processJoinRequest
};
