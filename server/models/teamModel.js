const { pool } = require('../config/db');

const createTeam = async (eventId, eventName, creatorId, teamName, description, lookingFor) => {
  const query = `
    INSERT INTO teams (event_id, event_name, creator_id, team_name, description, looking_for) 
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `;
  const values = [eventId ?? null, eventName, creatorId, teamName, description, lookingFor];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getTeamsByEvent = async (eventId) => {
  const query = `
    SELECT teams.*, COALESCE(teams.event_name, featured_events.title) AS event_name
    FROM teams
    LEFT JOIN featured_events ON featured_events.id = teams.event_id
    WHERE teams.event_id = $1
    ORDER BY teams.created_at DESC
  `;
  const { rows } = await pool.query(query, [eventId]);
  return rows;
};

const getTeamById = async (id) => {
  const query = `
    SELECT teams.*, COALESCE(teams.event_name, featured_events.title) AS event_name
    FROM teams
    LEFT JOIN featured_events ON featured_events.id = teams.event_id
    WHERE teams.id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

const updateTeamStatus = async (id, status) => {
  const query = 'UPDATE teams SET status = $1 WHERE id = $2 RETURNING *';
  const { rows } = await pool.query(query, [status, id]);
  return rows[0];
};

const deleteTeam = async (id) => {
  const query = 'DELETE FROM teams WHERE id = $1 RETURNING *';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

const getTeamsByCreator = async (creatorId) => {
  const query = `
    SELECT teams.*, COALESCE(teams.event_name, featured_events.title) AS event_name
    FROM teams
    LEFT JOIN featured_events ON featured_events.id = teams.event_id
    WHERE teams.creator_id = $1
    ORDER BY teams.created_at DESC
  `;
  const { rows } = await pool.query(query, [creatorId]);
  return rows;
};

const getAllTeams = async () => {
  const query = `
    SELECT teams.*, COALESCE(teams.event_name, featured_events.title) AS event_name
    FROM teams
    LEFT JOIN featured_events ON featured_events.id = teams.event_id
    ORDER BY teams.created_at DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
};

module.exports = {
  createTeam,
  getTeamsByEvent,
  getTeamById,
  updateTeamStatus,
  deleteTeam,
  getTeamsByCreator,
  getAllTeams
};
