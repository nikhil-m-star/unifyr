const { pool } = require('../config/db');

const createEvent = async (title, description, imageUrl, category, eventDate) => {
  const query = 'INSERT INTO featured_events (title, description, image_url, category, event_date) VALUES ($1, $2, $3, $4, $5) RETURNING *';
  const values = [title, description, imageUrl, category, eventDate];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

const getAllEvents = async () => {
  const query = 'SELECT * FROM featured_events ORDER BY event_date ASC';
  const { rows } = await pool.query(query);
  return rows;
};

const getEventById = async (id) => {
  const query = 'SELECT * FROM featured_events WHERE id = $1';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

const deleteEvent = async (id) => {
  const query = 'DELETE FROM featured_events WHERE id = $1 RETURNING *';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  deleteEvent
};
