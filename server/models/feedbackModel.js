const { pool } = require('../config/db');

const createFeedback = async (userId, content) => {
  const query = `
    INSERT INTO feedback (user_id, content)
    VALUES ($1, $2)
    RETURNING id, user_id, content, created_at
  `;
  const { rows } = await pool.query(query, [userId, content]);
  return rows[0];
};

const getAllFeedback = async () => {
  const query = `
    SELECT f.id, f.content, f.created_at,
           u.id AS user_id, u.name AS user_name, u.profile_pic, u.role
    FROM feedback f
    JOIN users u ON u.id = f.user_id
    ORDER BY f.created_at DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
};

const deleteFeedbackById = async (id) => {
  const query = 'DELETE FROM feedback WHERE id = $1 RETURNING id';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

module.exports = { createFeedback, getAllFeedback, deleteFeedbackById };
