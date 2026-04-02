const { listActiveUsers } = require('../services/presenceService');

const getActiveUsers = async (req, res) => {
  try {
    const users = listActiveUsers(req.dbUser?.id);
    res.json({ users, count: users.length });
  } catch (error) {
    console.error('Failed to fetch active users:', error);
    res.status(500).json({ message: 'Failed to fetch active users' });
  }
};

module.exports = {
  getActiveUsers,
};
