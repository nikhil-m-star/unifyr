const { pool } = require('../config/db');

const createChatSession = async (userOneId, userTwoId, topic) => {
  const query = `
    INSERT INTO chat_sessions (user_1_id, user_2_id, topic)
    VALUES ($1, $2, $3)
    RETURNING id, user_1_id, user_2_id, topic, created_at
  `;
  const { rows } = await pool.query(query, [userOneId, userTwoId, topic]);
  return rows[0];
};

const getChatSessionById = async (sessionId) => {
  const query = `
    SELECT id, user_1_id, user_2_id, topic, created_at
    FROM chat_sessions
    WHERE id = $1
  `;
  const { rows } = await pool.query(query, [sessionId]);
  return rows[0];
};

const getChatSessionByUsers = async (userOneId, userTwoId) => {
  const query = `
    SELECT id, user_1_id, user_2_id, topic, created_at
    FROM chat_sessions
    WHERE (user_1_id = $1 AND user_2_id = $2)
       OR (user_1_id = $2 AND user_2_id = $1)
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [userOneId, userTwoId]);
  return rows[0];
};

const getChatSessionMessages = async (sessionId) => {
  const query = `
    SELECT
      messages.id,
      messages.session_id,
      messages.sender_id,
      messages.content,
      messages.is_read,
      messages.created_at,
      users.name AS sender_name,
      users.profile_pic AS sender_profile_pic
    FROM messages
    LEFT JOIN users ON users.id = messages.sender_id
    WHERE messages.session_id = $1
    ORDER BY messages.created_at ASC
  `;
  const { rows } = await pool.query(query, [sessionId]);
  return rows;
};

const createMessage = async (sessionId, senderId, content) => {
  const query = `
    INSERT INTO messages (session_id, sender_id, content)
    VALUES ($1, $2, $3)
    RETURNING id, session_id, sender_id, content, created_at
  `;
  const { rows } = await pool.query(query, [sessionId, senderId, content]);
  return rows[0];
};

const markMessagesRead = async (sessionId, userId) => {
  const query = `
    UPDATE messages 
    SET is_read = TRUE 
    WHERE session_id = $1 
      AND sender_id != $2 
      AND is_read = FALSE
  `;
  await pool.query(query, [sessionId, userId]);
};

const getMessageById = async (messageId) => {
  const query = `
    SELECT id, session_id, sender_id, content, created_at
    FROM messages
    WHERE id = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [messageId]);
  return rows[0];
};

const deleteMessageById = async (messageId) => {
  const query = `
    DELETE FROM messages
    WHERE id = $1
    RETURNING id, session_id, sender_id
  `;
  const { rows } = await pool.query(query, [messageId]);
  return rows[0];
};

const deleteChatSessionById = async (sessionId) => {
  const query = `
    DELETE FROM chat_sessions
    WHERE id = $1
    RETURNING id, user_1_id, user_2_id
  `;
  const { rows } = await pool.query(query, [sessionId]);
  return rows[0];
};

const getUserChatSessions = async (userId) => {
  const query = `
    SELECT
      cs.id,
      cs.topic,
      cs.created_at,
      CASE
        WHEN cs.user_1_id = $1 THEN u2.id
        ELSE u1.id
      END AS partner_id,
      CASE
        WHEN cs.user_1_id = $1 THEN u2.name
        ELSE u1.name
      END AS partner_name,
      CASE
        WHEN cs.user_1_id = $1 THEN u2.profile_pic
        ELSE u1.profile_pic
      END AS partner_profile_pic,
      CASE
        WHEN cs.user_1_id = $1 THEN u2.role
        ELSE u1.role
      END AS partner_role,
      last_msg.content AS last_message_content,
      last_msg.created_at AS last_message_at,
      COALESCE(unread.count, 0) AS unread_count
    FROM chat_sessions cs
    JOIN users u1 ON u1.id = cs.user_1_id
    JOIN users u2 ON u2.id = cs.user_2_id
    LEFT JOIN LATERAL (
      SELECT content, created_at
      FROM messages
      WHERE session_id = cs.id
      ORDER BY created_at DESC
      LIMIT 1
    ) last_msg ON TRUE
    LEFT JOIN (
      SELECT session_id, COUNT(*) as count
      FROM messages
      WHERE is_read = FALSE AND sender_id != $1
      GROUP BY session_id
    ) unread ON unread.session_id = cs.id
    WHERE cs.user_1_id = $1 OR cs.user_2_id = $1
    ORDER BY COALESCE(last_msg.created_at, cs.created_at) DESC
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
};

const deleteOldChatSessions = async (days = 30) => {
  // Persistence enabled: No longer deleting old chat sessions by default.
  return [];
  /*
  const query = `
    DELETE FROM chat_sessions
    WHERE created_at < NOW() - INTERVAL '1 day' * $1
    RETURNING id
  `;
  const { rows } = await pool.query(query, [days]);
  return rows;
  */
};

const deleteExpiredOfflineMessages = async () => {
  const query = `
    DELETE FROM offline_messages
    WHERE delivered_at IS NOT NULL AND delivered_at < NOW() - INTERVAL '1 day'
  `;
  await pool.query(query);
};

module.exports = {
  createChatSession,
  getChatSessionById,
  getChatSessionByUsers,
  getChatSessionMessages,
  createMessage,
  markMessagesRead,
  getMessageById,
  deleteMessageById,
  deleteChatSessionById,
  getUserChatSessions,
  deleteOldChatSessions,
  deleteExpiredOfflineMessages,
};
