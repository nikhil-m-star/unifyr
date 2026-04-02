// In-memory matchmaking queue (no Redis required)
const matchmakingQueue = new Map();

const enqueueUser = async (userId, socketId, topicKeywords) => {
  matchmakingQueue.set(userId.toString(), {
    userId,
    socketId,
    topicKeywords,
    timestamp: Date.now()
  });
};

const dequeueUser = async (userId) => {
  matchmakingQueue.delete(userId.toString());
};

const findMatch = async (userId, topicKeywords, fallbackTimeout = 20000) => {
  const now = Date.now();
  let fallbackMatch = null;

  for (const [otherUserId, userEntry] of matchmakingQueue.entries()) {
    if (otherUserId === userId.toString()) continue;

    // 1. Exact Topic Match
    if (userEntry.topicKeywords === topicKeywords) {
      return userEntry;
    }

    // Track fallback candidate (someone waiting > 20s)
    if ((now - userEntry.timestamp) > fallbackTimeout && !fallbackMatch) {
      fallbackMatch = userEntry;
    }
  }

  // Check if current user has been waiting long enough for fallback
  const myEntry = matchmakingQueue.get(userId.toString());
  if (myEntry && (now - myEntry.timestamp) > fallbackTimeout) {
    if (fallbackMatch) return fallbackMatch;
    
    // Just pick any available user
    for (const [otherUserId, userEntry] of matchmakingQueue.entries()) {
      if (otherUserId !== userId.toString()) return userEntry;
    }
  }

  return null;
};

module.exports = {
  enqueueUser,
  dequeueUser,
  findMatch
};
