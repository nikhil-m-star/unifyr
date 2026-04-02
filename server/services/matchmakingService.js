// In-memory matchmaking queue (no Redis required)
const matchmakingQueue = new Map();

const normalizeTopic = (topicKeywords = '') => topicKeywords.trim().replace(/\s+/g, ' ').toLowerCase() || 'random';

const enqueueUser = async (userId, socketId, topicKeywords) => {
  matchmakingQueue.set(userId.toString(), {
    userId,
    socketId,
    topicKeywords: normalizeTopic(topicKeywords),
    timestamp: Date.now()
  });
};

const dequeueUser = async (userId) => {
  matchmakingQueue.delete(userId.toString());
};

const findMatch = async (userId) => {
  for (const [otherUserId, userEntry] of matchmakingQueue.entries()) {
    if (otherUserId !== userId.toString()) {
      return userEntry;
    }
  }

  return null;
};

module.exports = {
  enqueueUser,
  dequeueUser,
  findMatch,
  normalizeTopic
};
