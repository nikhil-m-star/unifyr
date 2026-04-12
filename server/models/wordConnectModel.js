const { pool } = require('../config/db');

const TOTAL_QUESTIONS = 6;

const upsertProfile = async (userId, answers) => {
  const client = await pool.connect();
  let result;
  try {
    await client.query('BEGIN');
    
    // Reset our old partner if they're stuck in pending with us
    const currentProfileQuery = `SELECT matched_with, match_status FROM word_connect_profiles WHERE user_id = $1`;
    const { rows: currRows } = await client.query(currentProfileQuery, [userId]);
    if (currRows.length > 0 && currRows[0].matched_with && currRows[0].match_status === 'pending') {
      await client.query(`UPDATE word_connect_profiles SET match_status = 'searching', matched_with = NULL WHERE user_id = $1`, [currRows[0].matched_with]);
    }

    const query = `
      INSERT INTO word_connect_profiles (user_id, answers, match_status, matched_with, updated_at)
      VALUES ($1, $2, 'searching', NULL, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        answers = $2,
        match_status = 'searching',
        matched_with = NULL,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, answers, match_status, matched_with, created_at, updated_at
    `;
    const { rows } = await client.query(query, [userId, JSON.stringify(answers)]);
    result = rows[0];
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return result;
};

const getProfileByUserId = async (userId) => {
  const query = `
    SELECT 
      wcp.id, wcp.user_id, wcp.answers, wcp.match_status, wcp.matched_with,
      wcp.past_matches, wcp.created_at, wcp.updated_at,
      u.name AS matched_name,
      u.profile_pic AS matched_profile_pic,
      u.role AS matched_role,
      partner.answers AS matched_answers
    FROM word_connect_profiles wcp
    LEFT JOIN users u ON u.id = wcp.matched_with
    LEFT JOIN word_connect_profiles partner ON partner.user_id = wcp.matched_with
    WHERE wcp.user_id = $1
  `;
  const { rows } = await pool.query(query, [userId]);
  const row = rows[0];
  
  if (!row) return null;

  let sharedCount = 0;
  let isFallbackRandom = false;

  if (row.answers && row.matched_answers) {
    const myAnswers = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
    const partnerAnswers = typeof row.matched_answers === 'string' ? JSON.parse(row.matched_answers) : row.matched_answers;
    
    // An empty answers object means they were drafted in via serendipity match
    if (Object.keys(partnerAnswers).length === 0) {
      isFallbackRandom = true;
    } else {
      for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
        const key = `q${i}`;
        if (myAnswers[key] && myAnswers[key] === partnerAnswers[key]) {
          sharedCount++;
        }
      }
      
      // If they had answers but shared less than the 3 question minimum, they were also formally a serendipity fallback
      if (sharedCount < 3) {
        isFallbackRandom = true;
      }
    }
  }

  return {
    ...row,
    sharedCount,
    score: sharedCount / TOTAL_QUESTIONS,
    isFallbackRandom
  };
};

/**
 * Find the best match for a user among all "searching" profiles.
 * Returns the top-scoring profile with ≥ 50% shared answers, or null.
 */
const findBestMatch = async (userId) => {
  const myProfile = await getProfileByUserId(userId);
  if (!myProfile || !myProfile.answers) return null;

  const myAnswers = typeof myProfile.answers === 'string'
    ? JSON.parse(myProfile.answers)
    : myProfile.answers;

  const pastMatchesArr = Array.isArray(myProfile.past_matches) ? myProfile.past_matches : [];
  const pastMatchesFilter = pastMatchesArr.length > 0 
    ? `AND wcp.user_id NOT IN (${pastMatchesArr.join(',')})` 
    : '';

  // Get all other searching profiles we haven't recently matched/chatted with
  const query = `
    SELECT 
      wcp.id, wcp.user_id, wcp.answers,
      u.name, u.profile_pic, u.role
    FROM word_connect_profiles wcp
    JOIN users u ON u.id = wcp.user_id
    WHERE wcp.match_status = 'searching'
      AND wcp.user_id != $1
      ${pastMatchesFilter}
      AND wcp.user_id NOT IN (
        SELECT user_1_id FROM chat_sessions WHERE user_2_id = $1
        UNION
        SELECT user_2_id FROM chat_sessions WHERE user_1_id = $1
      )
    ORDER BY RANDOM()
  `;
  const { rows } = await pool.query(query, [userId]);

  let bestMatch = null;
  const validCandidates = [];

  for (const candidate of rows) {
    const candidateAnswers = typeof candidate.answers === 'string'
      ? JSON.parse(candidate.answers)
      : candidate.answers;

    let sharedCount = 0;
    for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
      const key = `q${i}`;
      if (myAnswers[key] && myAnswers[key] === candidateAnswers[key]) {
        sharedCount++;
      }
    }

    const score = sharedCount / TOTAL_QUESTIONS;
    if (score >= 0.5) {
      validCandidates.push({
        profileId: candidate.id,
        userId: candidate.user_id,
        name: candidate.name,
        profile_pic: candidate.profile_pic,
        role: candidate.role,
        score,
        sharedCount,
      });
    }
  }

  if (validCandidates.length > 0) {
    bestMatch = validCandidates[Math.floor(Math.random() * validCandidates.length)];
  }

  // Fallback 1: If no one met the 50% threshold, match with a random searching user
  if (!bestMatch && rows.length > 0) {
    const randomCandidate = rows[Math.floor(Math.random() * rows.length)];
    const candidateAnswers = typeof randomCandidate.answers === 'string'
      ? JSON.parse(randomCandidate.answers)
      : randomCandidate.answers;
    
    let sharedCount = 0;
    for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
      const key = `q${i}`;
      if (myAnswers[key] && myAnswers[key] === candidateAnswers[key]) {
        sharedCount++;
      }
    }
    
    bestMatch = {
      profileId: randomCandidate.id,
      userId: randomCandidate.user_id,
      name: randomCandidate.name,
      profile_pic: randomCandidate.profile_pic,
      role: randomCandidate.role,
      score: sharedCount / TOTAL_QUESTIONS,
      sharedCount,
      isFallbackRandom: true
    };
  }

  // Fallback 2: If absolutely NO ONE is searching, match with a random user on the platform
  if (!bestMatch) {
    const pastMatchesUsersFilter = pastMatchesArr.length > 0 
      ? `AND id NOT IN (${pastMatchesArr.join(',')})` 
      : '';

    // Try to find someone new we haven't chatted with OR matched with recently
    let randomUserQuery = `
      SELECT id as user_id, name, profile_pic, role
      FROM users
      WHERE id != $1
        ${pastMatchesUsersFilter}
        AND id NOT IN (
          SELECT user_1_id FROM chat_sessions WHERE user_2_id = $1
          UNION
          SELECT user_2_id FROM chat_sessions WHERE user_1_id = $1
        )
      ORDER BY RANDOM()
      LIMIT 1
    `;
    let { rows: randomRows } = await pool.query(randomUserQuery, [userId]);
    
    // Cycle Logic: If we've exhausted all possible NEW users, but we HAVE past matches, reset past matches and cycle anew!
    if (randomRows.length === 0 && pastMatchesArr.length > 0) {
      await pool.query(`UPDATE word_connect_profiles SET past_matches = '[]'::jsonb WHERE user_id = $1`, [userId]);
      return await findBestMatch(userId);
    }

    // If we've chatted with literally everyone, strictly fallback to anyone else (even if chatted)
    if (randomRows.length === 0) {
      const fallbackQuery = `
        SELECT id as user_id, name, profile_pic, role
        FROM users
        WHERE id != $1
        ORDER BY RANDOM()
        LIMIT 1
      `;
      const res = await pool.query(fallbackQuery, [userId]);
      randomRows = res.rows;
    }

    if (randomRows.length > 0) {
      const randomUser = randomRows[0];
      bestMatch = {
        profileId: null,
        userId: randomUser.user_id,
        name: randomUser.name,
        profile_pic: randomUser.profile_pic,
        role: randomUser.role,
        score: 0,
        sharedCount: 0,
        isFallbackRandom: true
      };
    }
  }

  return bestMatch;
};

const setMatchPending = async (userId, matchedWithId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      UPDATE word_connect_profiles
      SET match_status = 'pending', matched_with = $2, 
          past_matches = COALESCE(past_matches, '[]'::jsonb) || jsonb_build_array($2::int),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [userId, matchedWithId]);

    await client.query(`
      INSERT INTO word_connect_profiles (user_id, answers, match_status, matched_with, past_matches, updated_at)
      VALUES ($2, '{}'::jsonb, 'pending', $1, jsonb_build_array($1::int), CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        match_status = 'pending', 
        matched_with = $1, 
        past_matches = COALESCE(word_connect_profiles.past_matches, '[]'::jsonb) || jsonb_build_array($1::int),
        updated_at = CURRENT_TIMESTAMP
    `, [userId, matchedWithId]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const acceptMatch = async (userId) => {
  const query = `
    UPDATE word_connect_profiles
    SET match_status = 'matched', updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND match_status = 'pending'
    RETURNING id, user_id, matched_with
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
};

const declineMatch = async (userId) => {
  const profile = await getProfileByUserId(userId);
  if (!profile || !profile.matched_with) return null;

  const otherUserId = profile.matched_with;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Reset the declining user back to searching
    await client.query(`
      UPDATE word_connect_profiles
      SET match_status = 'searching', matched_with = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [userId]);

    // Reset the other user back to searching too
    await client.query(`
      UPDATE word_connect_profiles
      SET match_status = 'searching', matched_with = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [otherUserId]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { declinedBy: userId, otherUserId };
};

const clearMatchForUser = async (userId) => {
  const query = `
    UPDATE word_connect_profiles
    SET match_status = 'searching', matched_with = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1
    RETURNING id, user_id
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows[0] || null;
};

module.exports = {
  upsertProfile,
  getProfileByUserId,
  findBestMatch,
  setMatchPending,
  acceptMatch,
  declineMatch,
  clearMatchForUser,
  TOTAL_QUESTIONS,
};
