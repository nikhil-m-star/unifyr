const { pool } = require('../config/db');

const createUser = async (clerkId, name, email, profilePic, role = 'student') => {
  const query = `
    INSERT INTO users (clerk_id, name, email, profile_pic, role) 
    VALUES ($1, $2, $3, $4, $5) 
    ON CONFLICT (clerk_id) DO UPDATE SET
      name = $2,
      email = $3,
      profile_pic = $4,
      role = CASE
        WHEN users.role = 'admin' OR EXCLUDED.role = 'admin' THEN 'admin'
        ELSE users.role
      END
    RETURNING id, clerk_id, name, email, role, profile_pic, bio, is_ready, ready_tag, created_at
  `;
  const values = [clerkId, name, email, profilePic, role];
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

const getAllUsers = async () => {
  const query = `
    SELECT id, clerk_id, name, email, role, profile_pic, bio, is_ready, ready_tag, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
};

const updateUserRoleById = async (id, role) => {
  const query = `
    UPDATE users
    SET role = $1
    WHERE id = $2
    RETURNING id, clerk_id, name, email, role, profile_pic, bio, is_ready, ready_tag, created_at
  `;
  const { rows } = await pool.query(query, [role, id]);
  return rows[0];
};

const updateUserById = async (id, updates = {}) => {
  const allowed = ['name', 'email', 'bio', 'profile_pic', 'is_ready', 'ready_tag'];
  const keys = Object.keys(updates).filter((key) => allowed.includes(key));

  if (keys.length === 0) {
    return getUserById(id);
  }

  const assignments = keys.map((key, index) => `${key} = $${index + 1}`);
  const values = keys.map((key) => updates[key]);
  values.push(id);

  const query = `
    UPDATE users
    SET ${assignments.join(', ')}
    WHERE id = $${values.length}
    RETURNING id, clerk_id, name, email, role, profile_pic, bio, is_ready, ready_tag, created_at
  `;

  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getPublicUserById = async (id) => {
  const query = 'SELECT id, name, role, profile_pic, bio, ready_tag FROM users WHERE id = $1';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

module.exports = {
  createUser,
  getUserByClerkId,
  getUserById,
  getAllUsers,
  updateUserRoleById,
  updateUserById,
  getPublicUserById,
};
