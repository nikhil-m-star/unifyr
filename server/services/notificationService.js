let ioInstance = null;
const { pool } = require('../config/db');

const init = (io) => {
  ioInstance = io;
};

const createNotification = async ({
  userId,
  type = 'general',
  title = 'Notification',
  message = '',
  sessionId = null,
}) => {
  const query = `
    INSERT INTO notifications (user_id, type, title, message, session_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, type, title, message, session_id, is_read, created_at
  `;
  const { rows } = await pool.query(query, [userId, type, title, message, sessionId]);
  return rows[0];
};

const getNotifications = async (userId, limit = 100) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const query = `
    SELECT id, user_id, type, title, message, session_id, is_read, created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;
  const { rows } = await pool.query(query, [userId, safeLimit]);
  return rows;
};

const markNotificationRead = async (userId, notificationId) => {
  const query = `
    UPDATE notifications
    SET is_read = TRUE
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const { rows } = await pool.query(query, [notificationId, userId]);
  return rows[0] || null;
};

const markAllNotificationsRead = async (userId) => {
  const query = `
    UPDATE notifications
    SET is_read = TRUE
    WHERE user_id = $1 AND is_read = FALSE
  `;
  await pool.query(query, [userId]);
};

const deleteNotification = async (userId, notificationId) => {
  const query = `
    DELETE FROM notifications
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const { rows } = await pool.query(query, [notificationId, userId]);
  return rows[0] || null;
};

const clearNotifications = async (userId) => {
  await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
};

const notifyRequestAccepted = async (applicantId, teamName, sessionId = null) => {
  if (!ioInstance) {
    console.error('Notification Service: ioInstance not initialized');
    return;
  }

  const payload = {
    type: 'request_accepted',
    title: 'Pitch Accepted! 🎉',
    message: `Your pitch to join "${teamName}" was accepted. You can now chat!`,
    sessionId,
    timestamp: new Date().toISOString()
  };

  try {
    const saved = await createNotification({
      userId: applicantId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      sessionId,
    });
    ioInstance.to(`user:${applicantId}`).emit('notification:acceptance', {
      ...payload,
      id: saved.id,
      read: saved.is_read,
    });
  } catch (error) {
    console.error('[Notification] Failed to persist acceptance notification:', error.message);
    ioInstance.to(`user:${applicantId}`).emit('notification:acceptance', payload);
  }
};

const notifyNewMessage = async (recipientId, senderName, content, sessionId) => {
  if (!ioInstance) {
    // Still store offline if IO is not ready
    await storeOfflineMessage(recipientId, sessionId, null, senderName, content);
    return false;
  }

  const notificationPayload = {
    type: 'new_message',
    title: `New Message from ${senderName}`,
    message: content.length > 60 ? `${content.substring(0, 57)}...` : content,
    sessionId: sessionId,
    timestamp: new Date().toISOString()
  };

  try {
    const saved = await createNotification({
      userId: recipientId,
      type: notificationPayload.type,
      title: notificationPayload.title,
      message: notificationPayload.message,
      sessionId,
    });
    notificationPayload.id = saved.id;
    notificationPayload.read = saved.is_read;
  } catch (error) {
    console.error('[Notification] Failed to persist message notification:', error.message);
  }

  // Try to deliver via socket
  const room = ioInstance.sockets.adapter.rooms.get(`user:${recipientId}`);
  if (room && room.size > 0) {
    // User is online, deliver notification
    ioInstance.to(`user:${recipientId}`).emit('notification:message', notificationPayload);
    console.log(`[Notification] Delivered notification to online user ${recipientId}`);
    return true;
  } else {
    // User is offline, store for later delivery
    await storeOfflineMessage(recipientId, sessionId, null, senderName, content);
    console.log(`[Notification] Stored offline message for user ${recipientId}`);
    return false;
  }
};

const storeOfflineMessage = async (recipientId, sessionId, senderId, senderName, content) => {
  try {
    const query = `
      INSERT INTO offline_messages (recipient_id, session_id, sender_id, sender_name, content)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    await pool.query(query, [recipientId, sessionId, senderId, senderName, content]);
    console.log(`[Notification] Offline message stored for user ${recipientId}`);
  } catch (error) {
    console.error('[Notification] Error storing offline message:', error.message);
  }
};

const getOfflineMessages = async (userId) => {
  try {
    const query = `
      SELECT id, session_id, sender_id, sender_name, content, sent_at
      FROM offline_messages
      WHERE recipient_id = $1 AND delivered_at IS NULL
      ORDER BY sent_at ASC
      LIMIT 100
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  } catch (error) {
    console.error('[Notification] Error fetching offline messages:', error.message);
    return [];
  }
};

const markOfflineMessagesDelivered = async (messageIds) => {
  if (!messageIds || messageIds.length === 0) return;
  
  try {
    const placeholders = messageIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `
      UPDATE offline_messages
      SET delivered_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `;
    await pool.query(query, messageIds);
    console.log(`[Notification] Marked ${messageIds.length} offline messages as delivered`);
  } catch (error) {
    console.error('[Notification] Error marking messages delivered:', error.message);
  }
};

const notifyNewJoinRequest = async (recipientId, senderName, teamName, pitchSnippet) => {
  if (!ioInstance) {
    console.error('Notification Service: ioInstance not initialized');
    return;
  }

  const payload = {
    type: 'new_join_request',
    title: 'New Pitch Received! 🚀',
    message: `${senderName} wants to join "${teamName}": "${pitchSnippet}"`,
    senderName,
    teamName,
    timestamp: new Date().toISOString()
  };

  try {
    const saved = await createNotification({
      userId: recipientId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
    });
    ioInstance.to(`user:${recipientId}`).emit('notification:join_request', {
      ...payload,
      id: saved.id,
      read: saved.is_read,
      sessionId: null,
    });
  } catch (error) {
    console.error('[Notification] Failed to persist join request notification:', error.message);
    ioInstance.to(`user:${recipientId}`).emit('notification:join_request', payload);
  }
};

const notifyWordConnectMatch = async (targetUserId, requesterName, requesterProfilePic, sharedCount) => {
  if (!ioInstance) return;

  const payload = {
    type: 'wordconnect_match',
    title: '🔗 Word Connect Match!',
    message: `${requesterName} matched with you (${sharedCount} shared answers). Tap to respond!`,
    requesterName,
    requesterProfilePic,
    sharedCount,
    timestamp: new Date().toISOString(),
  };

  try {
    const saved = await createNotification({
      userId: targetUserId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
    });
    ioInstance.to(`user:${targetUserId}`).emit('wordconnect:match_request', {
      ...payload,
      id: saved.id,
      read: saved.is_read,
      sessionId: null,
    });
  } catch (error) {
    console.error('[Notification] Failed to persist word connect match notification:', error.message);
    ioInstance.to(`user:${targetUserId}`).emit('wordconnect:match_request', payload);
  }
};

const notifyWordConnectAccepted = async (targetUserId, accepterName, sessionId) => {
  if (!ioInstance) return;

  const payload = {
    type: 'wordconnect_accepted',
    title: '🎉 Match Accepted!',
    message: `${accepterName} accepted your Word Connect match! Start chatting now.`,
    accepterName,
    sessionId,
    timestamp: new Date().toISOString(),
  };

  try {
    const saved = await createNotification({
      userId: targetUserId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      sessionId,
    });
    ioInstance.to(`user:${targetUserId}`).emit('wordconnect:match_accepted', {
      ...payload,
      id: saved.id,
      read: saved.is_read,
    });
  } catch (error) {
    console.error('[Notification] Failed to persist word connect accepted notification:', error.message);
    ioInstance.to(`user:${targetUserId}`).emit('wordconnect:match_accepted', payload);
  }
};

const notifyWordConnectDeclined = async (targetUserId, declinerName) => {
  if (!ioInstance) return;

  const payload = {
    type: 'wordconnect_declined',
    title: 'Match Update',
    message: `Your Word Connect match didn't work out. Try again to find someone new!`,
    declinerName,
    timestamp: new Date().toISOString(),
  };

  try {
    const saved = await createNotification({
      userId: targetUserId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
    });
    ioInstance.to(`user:${targetUserId}`).emit('wordconnect:match_declined', {
      ...payload,
      id: saved.id,
      read: saved.is_read,
      sessionId: null,
    });
  } catch (error) {
    console.error('[Notification] Failed to persist word connect declined notification:', error.message);
    ioInstance.to(`user:${targetUserId}`).emit('wordconnect:match_declined', payload);
  }
};

module.exports = {
  init,
  createNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearNotifications,
  notifyRequestAccepted,
  notifyNewMessage,
  notifyNewJoinRequest,
  storeOfflineMessage,
  getOfflineMessages,
  markOfflineMessagesDelivered,
  notifyWordConnectMatch,
  notifyWordConnectAccepted,
  notifyWordConnectDeclined,
};
