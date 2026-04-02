const { verifyToken } = require('@clerk/express');
const { enqueueUser, dequeueUser, findMatch } = require('../services/matchmakingService');
const { pool } = require('../config/db');
const userModel = require('../models/userModel');
const { syncUserFromClerk } = require('../services/userSyncService');

const getTokenVerificationOptions = () => {
  if (process.env.CLERK_JWT_KEY) {
    return { jwtKey: process.env.CLERK_JWT_KEY };
  }

  if (process.env.CLERK_SECRET_KEY) {
    return { secretKey: process.env.CLERK_SECRET_KEY };
  }

  return {};
};

module.exports = (io) => {
  // Socket auth middleware — verify Clerk session token
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const verifiedToken = await verifyToken(token, getTokenVerificationOptions());
      socket.clerkUserId = verifiedToken.sub; // Clerk user ID
      socket.clerkClaims = verifiedToken;
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  const matchCheckerIntervals = new Map();

  io.on('connection', async (socket) => {
    console.log(`User connected to socket: ${socket.id} (Clerk: ${socket.clerkUserId})`);

    // Sync/fetch user from our DB
    let dbUser = null;

    try {
      dbUser = await syncUserFromClerk(socket.clerkUserId, socket.clerkClaims);
    } catch (error) {
      console.error('Socket user sync error:', error.message);
    }

    socket.on('join_queue', async ({ topicKeywords }) => {
      if (!dbUser) return;
      const userId = dbUser.id;
      
      await enqueueUser(userId, socket.id, topicKeywords);
      console.log(`User ${userId} joined queue for topic: ${topicKeywords}`);
      
      socket.emit('queue_joined', { status: 'waiting' });

      // Poll for matches every 3 seconds
      const interval = setInterval(async () => {
        const match = await findMatch(userId, topicKeywords);
        
        if (match) {
          await dequeueUser(userId);
          await dequeueUser(match.userId);

          clearInterval(interval);
          if (matchCheckerIntervals.has(match.userId)) {
            clearInterval(matchCheckerIntervals.get(match.userId));
            matchCheckerIntervals.delete(match.userId);
          }

          // Create a chat session in Postgres
          const query = 'INSERT INTO chat_sessions (user_1_id, user_2_id, topic) VALUES ($1, $2, $3) RETURNING id';
          const { rows } = await pool.query(query, [userId, match.userId, topicKeywords]);
          const sessionId = rows[0].id;

          // Fetch full profiles
          const currentUserProfile = await userModel.getUserById(userId);
          const matchedUserProfile = await userModel.getUserById(match.userId);

          socket.emit('match_success', { sessionId, partner: matchedUserProfile });
          io.to(match.socketId).emit('match_success', { sessionId, partner: currentUserProfile });
          
          console.log(`Matched ${userId} and ${match.userId}`);
        }
      }, 3000);

      matchCheckerIntervals.set(userId, interval);
    });

    socket.on('leave_queue', async () => {
      if (!dbUser) return;
      const userId = dbUser.id;
      await dequeueUser(userId);
      if (matchCheckerIntervals.has(userId)) {
        clearInterval(matchCheckerIntervals.get(userId));
        matchCheckerIntervals.delete(userId);
      }
      console.log(`User ${userId} left the queue`);
    });

    socket.on('disconnect', async () => {
      if (dbUser) {
        const userId = dbUser.id;
        await dequeueUser(userId);
        if (matchCheckerIntervals.has(userId)) {
          clearInterval(matchCheckerIntervals.get(userId));
          matchCheckerIntervals.delete(userId);
        }
      }
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};
