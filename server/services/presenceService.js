const connectedUsers = new Map();

const upsertConnectedUser = (user) => {
  if (!user?.id || !user?.socketId) {
    return;
  }

  const existing = connectedUsers.get(user.id) || { socketIds: new Set() };
  existing.id = user.id;
  existing.name = user.name;
  existing.role = user.role;
  existing.profile_pic = user.profile_pic;
  existing.ready_tag = user.ready_tag;
  existing.bio = user.bio;
  // email intentionally excluded for privacy
  existing.socketIds.add(user.socketId);
  existing.lastSeenAt = Date.now();

  connectedUsers.set(user.id, existing);
};

const removeConnectedUserSocket = (userId, socketId) => {
  const existing = connectedUsers.get(userId);
  if (!existing) {
    return;
  }

  existing.socketIds.delete(socketId);

  if (existing.socketIds.size === 0) {
    connectedUsers.delete(userId);
    return;
  }

  existing.lastSeenAt = Date.now();
  connectedUsers.set(userId, existing);
};

const listActiveUsers = (excludeUserId = null) =>
  Array.from(connectedUsers.values())
    .filter((user) => user.id !== excludeUserId)
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
    .map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      profile_pic: user.profile_pic,
      ready_tag: user.ready_tag,
      bio: user.bio,
      activeSocketCount: user.socketIds.size,
      lastSeenAt: user.lastSeenAt,
    }));

module.exports = {
  upsertConnectedUser,
  removeConnectedUserSocket,
  listActiveUsers,
};
