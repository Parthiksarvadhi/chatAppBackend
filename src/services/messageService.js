const pool = require('../config/database');

const sendPushNotification = require("../utils/sendPush");

async function sendMessage(groupId, userId, content, fileData = null) {
  try {
    const { file_url, file_name, file_size } = fileData || {};

    // 1️⃣ Save message
    const result = await pool.query(
      `INSERT INTO messages (group_id, user_id, content, file_url, file_name, file_size) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, group_id, user_id, content, file_url, file_name, file_size, created_at`,
      [groupId, userId, content, file_url, file_name, file_size]
    );

    const message = result.rows[0];

    // Get sender username and group name
    const senderResult = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [userId]
    );
    const senderName = senderResult.rows[0]?.username || 'Unknown';

    const groupResult = await pool.query(
      'SELECT name FROM groups WHERE id = $1',
      [groupId]
    );
    const groupName = groupResult.rows[0]?.name || 'Group';

    // 2️⃣ Get push tokens of group members (except sender)
    const tokensResult = await pool.query(
      `
      SELECT push_token
      FROM users
      WHERE id != $1
      AND id IN (
        SELECT user_id FROM group_members WHERE group_id = $2
      )
      `,
      [userId, groupId]
    );

    const tokens = tokensResult.rows.map(r => r.push_token).filter(Boolean);
    console.log('📤 Push tokens found for group', groupId, ':', tokens.length, 'tokens');
    console.log('📋 Token list:', tokens);

    // 3️⃣ Send notification
    if (tokens.length) {
      console.log('🚀 Sending push notifications to', tokens.length, 'users');
      await sendPushNotification(
        tokens,
        `${senderName} in ${groupName}`,
        content || "Sent an attachment",
        {
          messageId: message.id,
          groupId: groupId,
          senderId: userId,
          senderName: senderName,
          groupName: groupName,
        }
      );
      console.log('✅ Push notifications sent');
    } else {
      console.log('⚠️ No push tokens found for this group');
    }

    return message;
  } catch (err) {
    throw err;
  }
}


async function getGroupMessages(groupId, limit = 50, offset = 0) {
  try {
    const result = await pool.query(
      `SELECT m.id, m.group_id, m.user_id, m.content, m.file_url, m.file_name, m.file_size, m.created_at, u.username, u.email
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.group_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [groupId, limit, offset]
    );

    return result.rows.reverse();
  } catch (err) {
    throw err;
  }
}

async function deleteMessage(messageId, userId) {
  try {
    const result = await pool.query(
      'DELETE FROM messages WHERE id = $1 AND user_id = $2 RETURNING id',
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Message not found or unauthorized');
    }

    return result.rows[0];
  } catch (err) {
    throw err;
  }
}

async function markMessageAsRead(messageId, userId) {
  try {
    await pool.query(
      `INSERT INTO message_reads (message_id, user_id) 
       VALUES ($1, $2)
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [messageId, userId]
    );

    return getMessageReadCount(messageId);
  } catch (err) {
    throw err;
  }
}

async function getMessageReadCount(messageId) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as read_count FROM message_reads WHERE message_id = $1`,
      [messageId]
    );

    return parseInt(result.rows[0].read_count);
  } catch (err) {
    throw err;
  }
}

async function getMessageReaders(messageId) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, mr.read_at
       FROM message_reads mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1
       ORDER BY mr.read_at ASC`,
      [messageId]
    );

    return result.rows;
  } catch (err) {
    throw err;
  }
}

async function searchMessages(groupId, searchTerm) {
  try {
    const result = await pool.query(
      `SELECT m.id, m.group_id, m.user_id, m.content, m.file_url, m.file_name, m.created_at, u.username, u.email
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.group_id = $1 AND m.content ILIKE $2
       ORDER BY m.created_at DESC
       LIMIT 100`,
      [groupId, `%${searchTerm}%`]
    );

    return result.rows;
  } catch (err) {
    throw err;
  }
}

async function addReaction(messageId, userId, reactionType) {
  try {
    // First, remove any existing reaction from this user on this message
    await pool.query(
      `DELETE FROM message_reactions 
       WHERE message_id = $1 AND user_id = $2`,
      [messageId, userId]
    );

    // Then add the new reaction
    const result = await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, reaction_type) 
       VALUES ($1, $2, $3)
       RETURNING id`,
      [messageId, userId, reactionType]
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
}

async function removeReaction(messageId, userId, reactionType) {
  try {
    const result = await pool.query(
      `DELETE FROM message_reactions 
       WHERE message_id = $1 AND user_id = $2 AND reaction_type = $3
       RETURNING id`,
      [messageId, userId, reactionType]
    );

    return result.rows[0];
  } catch (err) {
    throw err;
  }
}

async function getMessageReactions(messageId) {
  try {
    const result = await pool.query(
      `SELECT mr.reaction_type, COUNT(*) as count, 
              array_agg(DISTINCT mr.user_id) as user_ids,
              json_agg(json_build_object('user_id', u.id, 'username', u.username) ORDER BY u.username) as users
       FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1
       GROUP BY mr.reaction_type
       ORDER BY count DESC`,
      [messageId]
    );

    return result.rows;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  sendMessage,
  getGroupMessages,
  deleteMessage,
  markMessageAsRead,
  getMessageReadCount,
  getMessageReaders,
  searchMessages,
  addReaction,
  removeReaction,
  getMessageReactions,
};
