const { pool } = require('./config/db');
async function inspect() {
  try {
    console.log('--- TABLES ---');
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log(tables.rows.map(r => r.table_name));

    console.log('\n--- USERS (Last 5) ---');
    const users = await pool.query('SELECT * FROM users ORDER BY id DESC LIMIT 5');
    console.log(users.rows);

    console.log('\n--- CHAT SESSIONS (Last 5) ---');
    const sessions = await pool.query('SELECT * FROM chat_sessions ORDER BY id DESC LIMIT 5');
    console.log(sessions.rows);

    console.log('\n--- MESSAGES (Last 5) ---');
    const msgs = await pool.query('SELECT * FROM messages ORDER BY id DESC LIMIT 5');
    console.log(msgs.rows);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
inspect();
