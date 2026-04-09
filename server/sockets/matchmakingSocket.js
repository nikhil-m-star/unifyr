const { verifyToken } = require('@clerk/express');
const { enqueueUser, dequeueUser, findMatch, normalizeTopic } = require('../services/matchmakingService');
const userModel = require('../models/userModel');
const { syncUserFromClerk } = require('../services/userSyncService');
const chatModel = require('../models/chatModel');
const notificationService = require('../services/notificationService');
const { upsertConnectedUser, removeConnectedUserSocket } = require('../services/presenceService');

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
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const verifiedToken = await verifyToken(token, getTokenVerificationOptions());
      socket.clerkUserId = verifiedToken.sub;
      socket.clerkClaims = verifiedToken;
      return next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  const matchCheckerIntervals = new Map();

  io.on('connection', async (socket) => {
    let dbUser = null;
    let syncPromise = null;

    // Start sync immediately
    syncPromise = (async () => {
      try {
        dbUser = await syncUserFromClerk(socket.clerkUserId, socket.clerkClaims);
        if (dbUser) {
          socket.join(`user:${dbUser.id}`);
          upsertConnectedUser({ ...dbUser, socketId: socket.id });
          console.log(`[Socket] User ${dbUser.name} (${dbUser.id}) connected and synced.`);
          return dbUser;
        }
      } catch (error) {
        console.error('[Socket] User sync error:', error.message);
      }
      return null;
    })();

    const ensureUser = async () => {
      if (dbUser) return dbUser;
      return await syncPromise;
    };

    socket.on('join_queue', async ({ topicKeywords } = {}) => {
      const user = await ensureUser();
      if (!user) {
        socket.emit('queue_error', { message: 'Could not sync your account for matchmaking yet.' });
        return;
      }

      const userId = user.id;
      const normalizedTopic = normalizeTopic(topicKeywords);

      await enqueueUser(userId, socket.id, normalizedTopic);
      socket.emit('queue_joined', { status: 'waiting' });

      const attemptMatch = async () => {
        const match = await findMatch(userId);
        if (!match) return;

        await dequeueUser(userId);
        await dequeueUser(match.userId);

        if (matchCheckerIntervals.has(userId)) {
          clearInterval(matchCheckerIntervals.get(userId));
          matchCheckerIntervals.delete(userId);
        }

        if (matchCheckerIntervals.has(match.userId)) {
          clearInterval(matchCheckerIntervals.get(match.userId));
          matchCheckerIntervals.delete(match.userId);
        }

        let session = await chatModel.getChatSessionByUsers(userId, match.userId);
        if (!session) {
          session = await chatModel.createChatSession(userId, match.userId, normalizedTopic);
        }

        const sessionId = session.id;
        const roomName = `chat:${sessionId}`;
        const matchedSocket = io.sockets.sockets.get(match.socketId);
        const currentUserProfile = await userModel.getUserById(userId);
        const matchedUserProfile = await userModel.getUserById(match.userId);

        socket.join(roomName);
        if (matchedSocket) {
          matchedSocket.join(roomName);
        }

        socket.emit('match_success', { sessionId, partner: matchedUserProfile });
        io.to(match.socketId).emit('match_success', { sessionId, partner: currentUserProfile });
      };

      await attemptMatch();
      const interval = setInterval(attemptMatch, 2500);
      matchCheckerIntervals.set(userId, interval);
    });

    socket.on('chat:join', async ({ sessionId } = {}) => {
      const user = await ensureUser();
      if (!user || !sessionId) {
        console.warn(`[Socket] chat:join failed. User synced: ${!!user}, SessionID: ${sessionId}`);
        return;
      }

      const session = await chatModel.getChatSessionById(Number(sessionId));
      if (!session) {
        console.warn(`[Socket] chat:join failed. Session ${sessionId} not found.`);
        return;
      }
      
      if (![session.user_1_id, session.user_2_id].includes(user.id)) {
        console.warn(`[Socket] chat:join failed. User ${user.id} not in session ${sessionId}.`);
        return;
      }

      const roomName = `chat:${session.id}`;
      socket.join(roomName);
      console.log(`[Socket] User ${user.id} joined room ${roomName}`);
    });

    socket.on('chat:send', async ({ sessionId, content } = {}) => {
      const user = await ensureUser();
      if (!user || !sessionId || typeof content !== 'string') return;

      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      const session = await chatModel.getChatSessionById(Number(sessionId));
      if (!session) return;
      if (![session.user_1_id, session.user_2_id].includes(user.id)) return;

      const message = await chatModel.createMessage(session.id, user.id, trimmedContent);
      const roomName = `chat:${session.id}`;
      
      const payload = {
        ...message,
        sender_name: user.name,
        sender_profile_pic: user.profile_pic,
      };

      io.to(roomName).emit('chat:message', payload);
      
      // LOGGING FOR DEBUGGING
      const room = io.sockets.adapter.rooms.get(roomName);
      const roomSize = room ? room.size : 0;
      console.log(`[Socket] Message sent from ${user.id} to room ${roomName}. Room size: ${roomSize}`);

      const recipientId = session.user_1_id === user.id ? session.user_2_id : session.user_1_id;
      notificationService.notifyNewMessage(recipientId, user.name, trimmedContent, session.id);
    });

    socket.on('chat:typing', async ({ sessionId, isTyping } = {}) => {
      const user = await ensureUser();
      if (!user || !sessionId) return;
      socket.to(`chat:${sessionId}`).emit('chat:typing', { sessionId, userId: user.id, isTyping });
    });

    socket.on('chat:seen', async ({ sessionId } = {}) => {
      const user = await ensureUser();
      if (!user || !sessionId) return;
      await chatModel.markMessagesRead(Number(sessionId), user.id);
      socket.to(`chat:${sessionId}`).emit('chat:seen', { sessionId, userId: user.id });
    });

    socket.on('leave_queue', async () => {
      const user = await ensureUser();
      if (!user) return;

      await dequeueUser(user.id);
      if (matchCheckerIntervals.has(user.id)) {
        clearInterval(matchCheckerIntervals.get(user.id));
        matchCheckerIntervals.delete(user.id);
      }
    });

    socket.on('disconnect', async () => {
      const user = await ensureUser();
      if (!user) return;

      await dequeueUser(user.id);
      removeConnectedUserSocket(user.id, socket.id);

      if (matchCheckerIntervals.has(user.id)) {
        clearInterval(matchCheckerIntervals.get(user.id));
        matchCheckerIntervals.delete(user.id);
      }
    });
  });
};
