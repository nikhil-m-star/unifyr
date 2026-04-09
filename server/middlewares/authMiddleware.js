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
    console.error(`[Auth] Sync failure for Clerk ID ${userId}:`, error.message, error.stack);
    res.status(500).json({ 
      message: 'Internal server error during user synchronization',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
