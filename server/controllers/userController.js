const { listActiveUsers } = require('../services/presenceService');

const getActiveUsers = async (req, res) => {
  try {
    const users = listActiveUsers(req.dbUser?.id);
    const userIds = users.map(u => u.id);
    res.json({ users, userIds, count: users.length });
  } catch (error) {
    console.error('Failed to fetch active users:', error);
    res.status(500).json({ message: 'Failed to fetch active users' });
  }
};

const getMe = async (req, res) => {
  try {
    if (!req.dbUser) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    res.status(200).json({
      user: req.dbUser,
      isAdmin: req.dbUser.role === 'admin',
    });
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    res.status(500).json({ message: 'Failed to fetch current user' });
  }
};

module.exports = {
  getActiveUsers,
  getMe,
};
