const userModel = require('../models/userModel');
const teamModel = require('../models/teamModel');
const eventModel = require('../models/eventModel');

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const getAdminOverview = async (req, res) => {
  try {
    const [users, teams, events] = await Promise.all([
      userModel.getAllUsers(),
      teamModel.getAllTeams(),
      eventModel.getAllEvents(),
    ]);

    res.status(200).json({ users, teams, events });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ message: 'Failed to load admin dashboard data.' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }
    const { role } = req.body;

    if (!role || !['student', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be either student or admin.' });
    }

    const updated = await userModel.updateUserRoleById(id, role);
    if (!updated) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User role updated.', user: updated });
  } catch (error) {
    console.error('Admin update user role error:', error);
    res.status(500).json({ message: 'Failed to update user role.' });
  }
};

const updateUser = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }
    const updated = await userModel.updateUserById(id, req.body || {});

    if (!updated) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User updated.', user: updated });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Failed to update user.' });
  }
};

const createAdminEvent = async (req, res) => {
  try {
    const { title, description, imageUrl, category, eventDate } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    const event = await eventModel.createEvent(
      title,
      description || '',
      imageUrl || '',
      category || 'General',
      eventDate || null
    );

    res.status(201).json({ message: 'Event created.', event });
  } catch (error) {
    console.error('Admin create event error:', error);
    res.status(500).json({ message: 'Failed to create event.' });
  }
};

const updateAdminEvent = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Invalid event id.' });
    }
    const updated = await eventModel.updateEvent(id, req.body || {});
    if (!updated) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.status(200).json({ message: 'Event updated.', event: updated });
  } catch (error) {
    console.error('Admin update event error:', error);
    res.status(500).json({ message: 'Failed to update event.' });
  }
};

const deleteAdminEvent = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Invalid event id.' });
    }
    const deleted = await eventModel.deleteEvent(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    res.status(200).json({ message: 'Event deleted.', event: deleted });
  } catch (error) {
    console.error('Admin delete event error:', error);
    res.status(500).json({ message: 'Failed to delete event.' });
  }
};

const updateAdminTeam = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Invalid team id.' });
    }
    const updated = await teamModel.adminUpdateTeam(id, req.body || {});
    if (!updated) {
      return res.status(404).json({ message: 'Team not found.' });
    }

    res.status(200).json({ message: 'Team updated.', team: updated });
  } catch (error) {
    console.error('Admin update team error:', error);
    res.status(500).json({ message: 'Failed to update team.' });
  }
};

const deleteAdminTeam = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Invalid team id.' });
    }
    const deleted = await teamModel.deleteTeam(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Team not found.' });
    }

    res.status(200).json({ message: 'Team deleted.', team: deleted });
  } catch (error) {
    console.error('Admin delete team error:', error);
    res.status(500).json({ message: 'Failed to delete team.' });
  }
};

module.exports = {
  getAdminOverview,
  updateUserRole,
  updateUser,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent,
  updateAdminTeam,
  deleteAdminTeam,
};
