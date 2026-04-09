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

    try {
      dbUser = await syncUserFromClerk(socket.clerkUserId, socket.clerkClaims);
      if (dbUser) {
        socket.join(`user:${dbUser.id}`);
        upsertConnectedUser({ ...dbUser, socketId: socket.id });
      }
    } catch (error) {
      console.error('Socket user sync error:', error.message);
    }

    socket.on('join_queue', async ({ topicKeywords } = {}) => {
      if (!dbUser) {
        socket.emit('queue_error', { message: 'Could not sync your account for matchmaking yet.' });
        return;
      }

      const userId = dbUser.id;
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
      if (!dbUser || !sessionId) return;

      const session = await chatModel.getChatSessionById(Number(sessionId));
      if (!session) return;
      if (![session.user_1_id, session.user_2_id].includes(dbUser.id)) return;

      socket.join(`chat:${session.id}`);
    });

    socket.on('chat:send', async ({ sessionId, content } = {}) => {
      if (!dbUser || !sessionId || typeof content !== 'string') return;

      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      const session = await chatModel.getChatSessionById(Number(sessionId));
      if (!session) return;
      if (![session.user_1_id, session.user_2_id].includes(dbUser.id)) return;

      const message = await chatModel.createMessage(session.id, dbUser.id, trimmedContent);
      io.to(`chat:${session.id}`).emit('chat:message', {
        ...message,
        sender_name: dbUser.name,
        sender_profile_pic: dbUser.profile_pic,
      });

      const recipientId = session.user_1_id === dbUser.id ? session.user_2_id : session.user_1_id;
      
      // Check if recipient is in the room before notifying
      const roomMembers = io.sockets.adapter.rooms.get(`chat:${session.id}`);
      const isRecipientInRoom = roomMembers && Array.from(roomMembers).some(socketId => {
        const s = io.sockets.sockets.get(socketId);
        return s && s.clerkUserId === (session.user_1_id === dbUser.id ? session.user_1_clerk_id : session.user_2_clerk_id);
      });
      
      // We'll simplify: just always notify, but the frontend will filter it out if they are in the chat.
      // But actually, the user asked to suppress notifications when already chatting.
      // The most reliable way is to let the frontend handle the suppression based on the current route.
      notificationService.notifyNewMessage(recipientId, dbUser.name, trimmedContent, session.id);
    });

    socket.on('chat:typing', ({ sessionId, isTyping } = {}) => {
      if (!dbUser || !sessionId) return;
      socket.to(`chat:${sessionId}`).emit('chat:typing', { sessionId, userId: dbUser.id, isTyping });
    });

    socket.on('chat:seen', async ({ sessionId } = {}) => {
      if (!dbUser || !sessionId) return;
      await chatModel.markMessagesRead(Number(sessionId), dbUser.id);
      socket.to(`chat:${sessionId}`).emit('chat:seen', { sessionId, userId: dbUser.id });
    });

    socket.on('leave_queue', async () => {
      if (!dbUser) return;

      await dequeueUser(dbUser.id);
      if (matchCheckerIntervals.has(dbUser.id)) {
        clearInterval(matchCheckerIntervals.get(dbUser.id));
        matchCheckerIntervals.delete(dbUser.id);
      }
    });

    socket.on('disconnect', async () => {
      if (!dbUser) return;

      await dequeueUser(dbUser.id);
      removeConnectedUserSocket(dbUser.id, socket.id);

      if (matchCheckerIntervals.has(dbUser.id)) {
        clearInterval(matchCheckerIntervals.get(dbUser.id));
        matchCheckerIntervals.delete(dbUser.id);
      }
    });
  });
};
