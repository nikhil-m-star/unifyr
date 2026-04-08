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

const updateEvent = async (id, updates = {}) => {
  const allowed = {
    title: 'title',
    description: 'description',
    imageUrl: 'image_url',
    category: 'category',
    eventDate: 'event_date',
  };

  const keys = Object.keys(updates).filter((key) => Object.prototype.hasOwnProperty.call(allowed, key));
  if (keys.length === 0) {
    return getEventById(id);
  }

  const assignments = keys.map((key, index) => `${allowed[key]} = $${index + 1}`);
  const values = keys.map((key) => updates[key]);
  values.push(id);

  const query = `
    UPDATE featured_events
    SET ${assignments.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;
  const { rows } = await pool.query(query, values);
  return rows[0];
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  deleteEvent,
  updateEvent,
};
