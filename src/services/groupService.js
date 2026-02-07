const pool = require('../config/database');

async function createGroup(name, description, userId) {
  try {
    const result = await pool.query(
      'INSERT INTO groups (name, description, created_by) VALUES ($1, $2, $3) RETURNING id, name, description, created_by, created_at',
      [name, description, userId]
    );

    const groupId = result.rows[0].id;

    // Add creator as admin
    await pool.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
      [groupId, userId, 'admin']
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
}

async function joinGroup(groupId, userId) {
  try {
    const result = await pool.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3) RETURNING id, group_id, user_id, role, joined_at',
      [groupId, userId, 'member']
    );

    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new Error('User already in group');
    }
    throw err;
  }
}

async function listUserGroups(userId) {
  try {
    const result = await pool.query(
      `SELECT g.id, g.name, g.description, g.created_by, g.created_at, gm.role
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (err) {
    throw err;
  }
}

async function getAllGroups() {
  try {
    const result = await pool.query(
      `SELECT DISTINCT g.id, g.name, g.description, g.created_by, g.created_at,
              u.username as creator_name,
              COUNT(DISTINCT gm.user_id) as member_count
       FROM groups g
       LEFT JOIN users u ON g.created_by = u.id
       LEFT JOIN group_members gm ON g.id = gm.group_id
       GROUP BY g.id, g.name, g.description, g.created_by, g.created_at, u.username
       ORDER BY g.created_at DESC`,
      []
    );

    return result.rows;
  } catch (err) {
    throw err;
  }
}

async function getGroupMembers(groupId) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, gm.role, gm.joined_at
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    return result.rows;
  } catch (err) {
    throw err;
  }
}

async function getGroupDetails(groupId) {
  try {
    const result = await pool.query(
      'SELECT id, name, description, created_by, created_at FROM groups WHERE id = $1',
      [groupId]
    );

    if (result.rows.length === 0) {
      throw new Error('Group not found');
    }

    return result.rows[0];
  } catch (err) {
    throw err;
  }
}

module.exports = {
  createGroup,
  joinGroup,
  listUserGroups,
  getAllGroups,
  getGroupMembers,
  getGroupDetails,
};
