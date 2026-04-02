const { clerkMiddleware, requireAuth, getAuth } = require('@clerk/express');
const { syncUserFromClerk } = require('../services/userSyncService');

// Clerk middleware - validates the session token automatically
const protect = clerkMiddleware();

// Require authenticated user
const requireAuthentication = requireAuth();

// Sync Clerk user to our DB and attach local user to req
const syncUser = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const sessionClaims = req.auth?.sessionClaims || {};
    const user = await syncUserFromClerk(userId, sessionClaims);

    req.dbUser = user; // Attach local DB user
    next();
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ message: error.message });
    }
    console.error('Sync user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Check admin role from our local DB
const isAdmin = (req, res, next) => {
  if (req.dbUser && req.dbUser.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

module.exports = {
  protect,
  requireAuthentication,
  syncUser,
  isAdmin,
};
