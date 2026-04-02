const { pool } = require('../config/db');

const createUser = async (clerkId, name, email, profilePic) => {
  const query = `
    INSERT INTO users (clerk_id, name, email, profile_pic) 
    VALUES ($1, $2, $3, $4) 
    ON CONFLICT (clerk_id) DO UPDATE SET name = $2, email = $3, profile_pic = $4
    RETURNING id, clerk_id, name, email, role, profile_pic, bio, created_at
  `;
  const values = [clerkId, name, email, profilePic];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getUserByClerkId = async (clerkId) => {
  const query = 'SELECT id, clerk_id, name, email, role, profile_pic, bio, is_ready, ready_tag, created_at FROM users WHERE clerk_id = $1';
  const { rows } = await pool.query(query, [clerkId]);
  return rows[0];
};

const getUserById = async (id) => {
  const query = 'SELECT id, clerk_id, name, email, role, profile_pic, bio, is_ready, ready_tag, created_at FROM users WHERE id = $1';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

module.exports = {
  createUser,
  getUserByClerkId,
  getUserById,
};
