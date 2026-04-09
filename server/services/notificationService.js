let ioInstance = null;
const { pool } = require('../config/db');

const init = (io) => {
  ioInstance = io;
};

const notifyRequestAccepted = (applicantId, teamName) => {
  if (!ioInstance) {
    console.error('Notification Service: ioInstance not initialized');
    return;
  }

  ioInstance.to(`user:${applicantId}`).emit('notification:acceptance', {
    type: 'request_accepted',
    title: 'Pitch Accepted! 🎉',
    message: `Your pitch to join "${teamName}" was accepted. You can now chat!`,
    timestamp: new Date().toISOString()
  });
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

module.exports = {
  init,
  notifyRequestAccepted,
  notifyNewMessage,
  storeOfflineMessage,
  getOfflineMessages,
  markOfflineMessagesDelivered
};
