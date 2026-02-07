const pool = require('../config/database');

async function getUserProfile(userId) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, up.avatar_url, up.bio, up.phone, up.location
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  } catch (err) {
    throw err;
  }
}

async function updateUserProfile(userId, profileData) {
  try {
    const { avatar_url, bio, phone, location } = profileData;

    // Check if profile exists
    const existing = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length === 0) {
      // Create new profile
      await pool.query(
        `INSERT INTO user_profiles (user_id, avatar_url, bio, phone, location)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, avatar_url, bio, phone, location]
      );
    } else {
      // Update existing profile
      await pool.query(
        `UPDATE user_profiles 
         SET avatar_url = COALESCE($2, avatar_url),
             bio = COALESCE($3, bio),
             phone = COALESCE($4, phone),
             location = COALESCE($5, location),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId, avatar_url, bio, phone, location]
      );
    }

    return getUserProfile(userId);
  } catch (err) {
    throw err;
  }
}

async function getUserPresence(userId) {
  try {
    const result = await pool.query(
      'SELECT user_id, status, last_seen FROM user_presence WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default presence
      await pool.query(
        'INSERT INTO user_presence (user_id, status) VALUES ($1, $2)',
        [userId, 'offline']
      );
      return { user_id: userId, status: 'offline', last_seen: new Date() };
    }

    return result.rows[0];
  } catch (err) {
    throw err;
  }
}

async function updateUserPresence(userId, status) {
  try {
    await pool.query(
      `UPDATE user_presence 
       SET status = $2, last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId, status]
    );

    return getUserPresence(userId);
  } catch (err) {
    throw err;
  }
}

async function getGroupPresence(groupId) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, up.status, up.last_seen
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       LEFT JOIN user_presence up ON u.id = up.user_id
       WHERE gm.group_id = $1
       ORDER BY u.username`,
      [groupId]
    );

    return result.rows;
  } catch (err) {
    throw err;
  }
}

async function savePushToken(userId, pushToken) {
  try {
    await pool.query(
      'UPDATE users SET push_token = $2 WHERE id = $1',
      [userId, pushToken]
    );

    return { success: true, message: 'Push token saved' };
  } catch (err) {
    throw err;
  }
}

async function getPushToken(userId) {
  try {
    const result = await pool.query(
      'SELECT push_token FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0].push_token;
  } catch (err) {
    throw err;
  }
}

async function getGroupPushTokens(groupId) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.push_token
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = $1 AND u.push_token IS NOT NULL`,
      [groupId]
    );

    return result.rows;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserPresence,
  updateUserPresence,
  getGroupPresence,
  savePushToken,
  getPushToken,
  getGroupPushTokens,
};
