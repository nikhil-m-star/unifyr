const { pool } = require('../config/db');

async function migrate() {
  try {
    console.log('Starting migration: adding chat_session_id to join_requests...');
    await pool.query(`
      ALTER TABLE join_requests 
      ADD COLUMN IF NOT EXISTS chat_session_id INTEGER REFERENCES chat_sessions(id);
    `);
    console.log('Migration successful: chat_session_id added.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit();
  }
}

migrate();
