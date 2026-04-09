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

// Deliver offline messages to a reconnected user
const deliverOfflineMessages = async (socket, userId) => {
  try {
    const offlineMessages = await notificationService.getOfflineMessages(userId);
    if (offlineMessages.length === 0) return;

    console.log(`[Socket] Delivering ${offlineMessages.length} offline messages to user ${userId}`);
    
    offlineMessages.forEach(msg => {
      socket.emit('notification:message', {
        type: 'new_message',
        title: `New Message from ${msg.sender_name}`,
        message: msg.content.length > 60 ? `${msg.content.substring(0, 57)}...` : msg.content,
        sessionId: msg.session_id,
        timestamp: msg.sent_at,
        isOfflineMessage: true
      });
    });

    // Mark all delivered
    const messageIds = offlineMessages.map(m => m.id);
    await notificationService.markOfflineMessagesDelivered(messageIds);
  } catch (error) {
    console.error('[Socket] Error delivering offline messages:', error.message);
  }
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
  const pendingMatches = new Map(); // sessionKey -> { userAId, userBId, userASocketId, userBSocketId, topic, acceptedBy: Set, timeoutId }

  const getSessionKey = (id1, id2) => {
    const sorted = [Number(id1), Number(id2)].sort((a, b) => a - b);
    return `${sorted[0]}:${sorted[1]}`;
  };

  io.on('connection', async (socket) => {
    let dbUser = null;
    let syncPromise = null;

    // Start sync immediately
    syncPromise = (async () => {
      try {
        if (matchCheckerIntervals.size > 500) {
          // Safety valve: clear all intervals if map grows unexpectedly large
          for (const [id, interval] of matchCheckerIntervals) {
            clearInterval(interval);
            matchCheckerIntervals.delete(id);
          }
          console.warn('[Socket] matchCheckerIntervals safety valve triggered: Map cleared.');
        }

        dbUser = await syncUserFromClerk(socket.clerkUserId, socket.clerkClaims);
        if (dbUser) {
          socket.join(`user:${dbUser.id}`);
          upsertConnectedUser({ ...dbUser, socketId: socket.id });
          console.log(`[Socket] User ${dbUser.name} (${dbUser.id}) connected and synced.`);
          
          // Deliver offline messages on reconnect
          await deliverOfflineMessages(socket, dbUser.id);
          
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

        // Skip if already trying to pair this exact instance
        const sessionKey = getSessionKey(userId, match.userId);
        if (pendingMatches.has(sessionKey)) return;

        // Check if they already have a chat session
        const existingSession = await chatModel.getChatSessionByUsers(userId, match.userId);

        // Dequeue both to prevent double-matching
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

        const currentUserProfile = await userModel.getPublicUserById(userId);
        const matchedUserProfile = await userModel.getPublicUserById(match.userId);

        if (existingSession) {
          // If they already know each other, auto-connect and skip the two-step accept!
          io.to(socket.id).emit('match_success', { sessionId: existingSession.id, partner: matchedUserProfile });
          io.to(match.socketId).emit('match_success', { sessionId: existingSession.id, partner: currentUserProfile });
          console.log(`[Socket] Users ${userId} & ${match.userId} rematched. Auto-connected to session ${existingSession.id}.`);
          return;
        }

        const matchId = sessionKey;
        const pendingMatch = {
          userAId: userId,
          userBId: match.userId,
          userASocketId: socket.id,
          userBSocketId: match.socketId,
          topic: normalizedTopic,
          acceptedBy: new Set(),
          timeoutId: setTimeout(() => {
            const m = pendingMatches.get(matchId);
            if (m) {
              io.to(m.userASocketId).emit('match_cancelled', { matchId, reason: 'timeout' });
              io.to(m.userBSocketId).emit('match_cancelled', { matchId, reason: 'timeout' });
              pendingMatches.delete(matchId);
              console.log(`[Socket] Match ${matchId} cancelled due to timeout.`);
            }
          }, 30000)
        };

        pendingMatches.set(matchId, pendingMatch);

        socket.emit('match_pending', { 
          matchId, 
          partnerName: matchedUserProfile.name, 
          partnerProfilePic: matchedUserProfile.profile_pic 
        });
        
        io.to(match.socketId).emit('match_pending', { 
          matchId, 
          partnerName: currentUserProfile.name, 
          partnerProfilePic: currentUserProfile.profile_pic 
        });
      };

      await attemptMatch();
      const interval = setInterval(attemptMatch, 2500);
      matchCheckerIntervals.set(userId, interval);
    });
    socket.on('chat:accept', async ({ matchId }) => {
      try {
        const user = await ensureUser();
        if (!user || !matchId) return;

        const match = pendingMatches.get(matchId);
        if (!match) return;

        match.acceptedBy.add(user.id);
        console.log(`[Socket] User ${user.id} accepted match ${matchId}. Accepted by:`, [...match.acceptedBy]);

        if (match.acceptedBy.size === 2) {
          clearTimeout(match.timeoutId);
          pendingMatches.delete(matchId);

          let session = await chatModel.getChatSessionByUsers(match.userAId, match.userBId);
          if (!session) {
            session = await chatModel.createChatSession(match.userAId, match.userBId, match.topic);
          }

          const sessionId = session.id;
          const roomName = `chat:${sessionId}`;
          
          const socketA = io.sockets.sockets.get(match.userASocketId);
          const socketB = io.sockets.sockets.get(match.userBSocketId);
          
          if (socketA) socketA.join(roomName);
          if (socketB) socketB.join(roomName);

          const userAProfile = await userModel.getPublicUserById(match.userAId);
          const userBProfile = await userModel.getPublicUserById(match.userBId);

          if (!userAProfile || !userBProfile) {
            console.error('[Socket] Match success failed: missing profile for one of the users.', { match });
            return;
          }

          io.to(match.userASocketId).emit('match_success', { sessionId, partner: userBProfile });
          io.to(match.userBSocketId).emit('match_success', { sessionId, partner: userAProfile });
          console.log(`[Socket] Match ${matchId} completed. Session ${sessionId} created.`);
        }
      } catch (error) {
        console.error('[Socket] chat:accept error:', error);
      }
    });

    socket.on('chat:decline', async ({ matchId }) => {
      const user = await ensureUser();
      if (!user || !matchId) return;

      const match = pendingMatches.get(matchId);
      if (!match) return;

      clearTimeout(match.timeoutId);
      pendingMatches.delete(matchId);

      io.to(match.userASocketId).emit('match_cancelled', { matchId, reason: 'declined' });
      io.to(match.userBSocketId).emit('match_cancelled', { matchId, reason: 'declined' });

      // Re-enqueue the non-declining user
      const otherUserId = match.userAId === user.id ? match.userBId : match.userAId;
      const otherSocketId = match.userAId === user.id ? match.userBSocketId : match.userASocketId;
      
      console.log(`[Socket] User ${user.id} declined match ${matchId}. Re-enqueuing user ${otherUserId}.`);
      await enqueueUser(otherUserId, otherSocketId, match.topic);
    });

    socket.on('chat:join', async ({ sessionId } = {}) => {
      const user = await ensureUser();
      if (!user || !sessionId) {
        console.warn(`[Socket] chat:join failed. User synced: ${!!user}, SessionID: ${sessionId}`);
        socket.emit('chat:error', { error: 'Failed to join chat: invalid session ID' });
        return;
      }

      const session = await chatModel.getChatSessionById(Number(sessionId));
      if (!session) {
        console.warn(`[Socket] chat:join failed. Session ${sessionId} not found.`);
        socket.emit('chat:error', { error: 'Chat session not found' });
        return;
      }
      
      if (![session.user_1_id, session.user_2_id].includes(user.id)) {
        console.warn(`[Socket] chat:join failed. User ${user.id} not in session ${sessionId}.`);
        socket.emit('chat:error', { error: 'You are not authorized to access this chat' });
        return;
      }

      const roomName = `chat:${session.id}`;
      socket.join(roomName);
      socket.emit('chat:room-joined', { sessionId: session.id, roomName });
      console.log(`[Socket] User ${user.id} joined room ${roomName} and confirmed`);
    });

    socket.on('chat:send', async ({ sessionId, content } = {}) => {
      const user = await ensureUser();
      
      if (!user) {
        socket.emit('chat:error', { error: 'Please log in again to send messages' });
        return;
      }
      
      if (!sessionId) {
        socket.emit('chat:error', { error: 'Invalid chat session', messageText: content });
        return;
      }
      
      if (typeof content !== 'string') {
        socket.emit('chat:error', { error: 'Message must be text', messageText: content });
        return;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        socket.emit('chat:error', { error: 'Message cannot be empty', messageText: content });
        return;
      }

      if (trimmedContent.length > 2000) {
        socket.emit('chat:error', { error: 'Message is too long (max 2000 characters)', messageText: content });
        return;
      }

      const session = await chatModel.getChatSessionById(Number(sessionId));
      if (!session) {
        socket.emit('chat:error', { error: 'Chat session not found', messageText: trimmedContent });
        return;
      }
      
      if (![session.user_1_id, session.user_2_id].includes(user.id)) {
        socket.emit('chat:error', { error: 'You are not authorized to send messages in this chat', messageText: trimmedContent });
        return;
      }

      const message = await chatModel.createMessage(session.id, user.id, trimmedContent);
      const roomName = `chat:${session.id}`;
      
      const payload = {
        ...message,
        sender_name: user.name,
        sender_profile_pic: user.profile_pic,
      };

      // Ensure room size is logged for debugging
      const room = io.sockets.adapter.rooms.get(roomName);
      const roomSize = room ? room.size : 0;
      console.log(`[Socket] Dispatching message to room ${roomName} (Size: ${roomSize})`);

      io.to(roomName).emit('chat:message', payload);
      
      const recipientId = session.user_1_id === user.id ? session.user_2_id : session.user_1_id;
      
      // Notify recipient only if they are not active in the chat room
      // (This is a refinement: users usually don't want push notifications for rooms they are looking at)
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
