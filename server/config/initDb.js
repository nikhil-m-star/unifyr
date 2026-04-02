const { pool } = require('./db');

const createTables = async () => {
  const queryText = `
    -- Users (Clerk-managed auth, no password_hash needed)
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        clerk_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'student',
        profile_pic TEXT,
        bio TEXT,
        is_ready BOOLEAN DEFAULT FALSE,
        ready_tag VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Admin-Curated Featured Events
    CREATE TABLE IF NOT EXISTS featured_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        category VARCHAR(100),
        event_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Student-Created Teams
    CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        event_id INT REFERENCES featured_events(id) ON DELETE CASCADE,
        event_name VARCHAR(255),
        creator_id INT REFERENCES users(id) ON DELETE CASCADE,
        team_name VARCHAR(255) NOT NULL,
        description TEXT,
        looking_for TEXT,
        status VARCHAR(50) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Join Requests for Teams
    CREATE TABLE IF NOT EXISTS join_requests (
        id SERIAL PRIMARY KEY,
        team_id INT REFERENCES teams(id) ON DELETE CASCADE,
        sender_id INT REFERENCES users(id) ON DELETE CASCADE,
        pitch TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Matchmaking & Chat Persistence
    CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        user_1_id INT REFERENCES users(id) ON DELETE SET NULL,
        user_2_id INT REFERENCES users(id) ON DELETE SET NULL,
        topic VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        session_id INT REFERENCES chat_sessions(id) ON DELETE CASCADE,
        sender_id INT REFERENCES users(id) ON DELETE SET NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_id INT REFERENCES users(id) ON DELETE SET NULL,
        reported_id INT REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS blocks (
        id SERIAL PRIMARY KEY,
        blocker_id INT REFERENCES users(id) ON DELETE CASCADE,
        blocked_id INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(blocker_id, blocked_id)
    );
  `;

  try {
    await pool.query(queryText);
    await pool.query('ALTER TABLE teams ADD COLUMN IF NOT EXISTS event_name VARCHAR(255)');
    console.log('Tables created or verified successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};

if (require.main === module) {
  createTables().then(() => process.exit(0));
}

module.exports = { createTables };
