const { pool } = require('../config/db');

const createJoinRequest = async (teamId, senderId, pitch) => {
  const query = `
    INSERT INTO join_requests (team_id, sender_id, pitch) 
    VALUES ($1, $2, $3) RETURNING *
  `;
  const { rows } = await pool.query(query, [teamId, senderId, pitch]);
  return rows[0];
};

const getRequestsByTeam = async (teamId) => {
  const query = `
    SELECT
      join_requests.*,
      users.name AS sender_name,
      users.email AS sender_email,
      users.role AS sender_role,
      users.profile_pic AS sender_profile_pic,
      users.bio AS sender_bio
    FROM join_requests
    LEFT JOIN users ON users.id = join_requests.sender_id
    WHERE join_requests.team_id = $1
    ORDER BY join_requests.created_at DESC
  `;
  const { rows } = await pool.query(query, [teamId]);
  return rows;
};

const updateRequestStatus = async (id, status) => {
  const query = 'UPDATE join_requests SET status = $1 WHERE id = $2 RETURNING *';
  const { rows } = await pool.query(query, [status, id]);
  return rows[0];
};

const getRequestById = async (id) => {
  const query = 'SELECT * FROM join_requests WHERE id = $1';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

const getPendingRequestByTeamAndSender = async (teamId, senderId) => {
  const query = `
    SELECT *
    FROM join_requests
    WHERE team_id = $1 AND sender_id = $2 AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [teamId, senderId]);
  return rows[0];
};

module.exports = {
  createJoinRequest,
  getRequestsByTeam,
  updateRequestStatus,
  getRequestById,
  getPendingRequestByTeamAndSender
};
