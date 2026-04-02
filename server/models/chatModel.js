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

const getChatSessionMessages = async (sessionId) => {
  const query = `
    SELECT
      messages.id,
      messages.session_id,
      messages.sender_id,
      messages.content,
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

module.exports = {
  createChatSession,
  getChatSessionById,
  getChatSessionMessages,
  createMessage,
};
