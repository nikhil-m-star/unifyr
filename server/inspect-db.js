const { pool } = require('./config/db');
async function inspect() {
  try {
    const users = await pool.query('SELECT id, auth_id, name FROM users');
    console.log('Users:', users.rows);
    const sessions = await pool.query('SELECT id, user_1_id, user_2_id FROM chat_sessions');
    console.log('Sessions:', sessions.rows);
    const msgs = await pool.query('SELECT id, session_id, sender_id, content FROM messages LIMIT 5');
    console.log('Messages:', msgs.rows);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
inspect();
