const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');
const { sendPush } = require('../../utils/push');

function toResponse(row) {
  return {
    id: row.id,
    school_id: row.school_id || undefined,
    user_id: row.user_id || undefined,
    title: row.title,
    body: row.body,
    type: row.type,
    is_read: row.is_read,
    created_at: row.created_at,
    action_url: row.action_url || undefined,
  };
}

/** Lists the CURRENT user's own notifications only — never any other user's. */
async function list(userId, { page, pageSize, offset }, filters) {
  const conditions = ['n.user_id = $1'];
  const params = [userId];
  if (filters.is_read !== undefined) {
    params.push(filters.is_read === 'true');
    conditions.push(`n.is_read = $${params.length}`);
  }
  if (filters.type) {
    params.push(filters.type);
    conditions.push(`n.type = $${params.length}`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM notifications n ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `SELECT n.* FROM notifications n ${where} ORDER BY n.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { notifications: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

/** Fast count for a header badge — current user's unread notifications. */
async function unreadCount(userId) {
  const { rows } = await query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return rows[0].count;
}

/**
 * Fetches a notification only if it belongs to userId — the ownership check
 * is folded into the WHERE clause so a mismatched owner looks identical to a
 * missing row (404), never leaking whether the id exists for someone else.
 */
async function getOwnedById(id, userId) {
  const { rows } = await query('SELECT * FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!rows[0]) throw ApiError.notFound('Notification not found');
  return rows[0];
}

/** Resolves push tokens for a batch of users — prefers each user's registered
 * fcm_tokens (multi-device); falls back to the legacy users.fcm_token column
 * only for a user with zero rows in fcm_tokens, so accounts that haven't
 * moved to the per-device registration flow yet still receive pushes. */
async function resolvePushTokens(userIds) {
  if (!userIds.length) return [];
  const { rows: deviceRows } = await query(
    'SELECT user_id, token FROM fcm_tokens WHERE user_id = ANY($1)',
    [userIds]
  );
  const usersWithDeviceTokens = new Set(deviceRows.map((r) => r.user_id));
  const legacyUserIds = userIds.filter((id) => !usersWithDeviceTokens.has(id));
  let legacyTokens = [];
  if (legacyUserIds.length) {
    const { rows } = await query(
      'SELECT fcm_token FROM users WHERE id = ANY($1) AND fcm_token IS NOT NULL',
      [legacyUserIds]
    );
    legacyTokens = rows.map((r) => r.fcm_token);
  }
  return [...deviceRows.map((r) => r.token), ...legacyTokens];
}

/**
 * Plain function other backend modules can call directly (no HTTP round
 * trip) to push a notification to a user, e.g.:
 *
 *   const { createNotification } = require('../notifications/notifications.service');
 *   await createNotification({
 *     school_id: leave.school_id,
 *     user_id: requesterId,
 *     title: 'Leave request approved',
 *     body: `Your leave request for ${leave.from_date} was approved.`,
 *     type: 'leave',
 *     action_url: `/leave/${leave.id}`,
 *   });
 *
 * school_id and action_url are optional; the rest are required.
 */
async function createNotification({ school_id, user_id, title, body, type, action_url }) {
  const { rows } = await query(
    `INSERT INTO notifications (school_id, user_id, title, body, type, action_url)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [school_id || null, user_id || null, title, body, type, action_url || null]
  );

  // Best-effort push — the in-app inbox row above is the source of truth;
  // a push failure (or missing/stubbed token) must never fail notification creation.
  if (user_id) {
    try {
      const tokens = await resolvePushTokens([user_id]);
      await Promise.all(tokens.map((token) => sendPush({ token, title, body, data: { type, action_url } })));
    } catch (err) {
      console.error('Failed to send push notification', err);
    }
  }

  return toResponse(rows[0]);
}

async function markRead(id, userId) {
  await getOwnedById(id, userId);
  const { rows } = await query(
    'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
    [id]
  );
  return toResponse(rows[0]);
}

async function markAllRead(userId) {
  await query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [userId]);
}

async function remove(id, userId) {
  await getOwnedById(id, userId);
  const { rowCount } = await query('DELETE FROM notifications WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('Notification not found');
}

async function broadcastNotification(schoolId, senderId, payload) {
  const { title, body, type, audience, route_ids, driver_ids } = payload;
  let userIds = [];

  if (audience === 'all_parents') {
    const { rows } = await query(`
      SELECT DISTINCT u.id 
      FROM parent_details p
      JOIN users u ON u.email = p.email
      JOIN students s ON s.id = p.student_id
      WHERE s.school_id = $1
    `, [schoolId]);
    userIds = rows.map(r => r.id);
  } else if (audience === 'specific_route' && route_ids?.length) {
    const { rows } = await query(`
      SELECT DISTINCT u.id 
      FROM students s
      JOIN parent_details p ON p.student_id = s.id
      JOIN users u ON u.email = p.email
      WHERE s.school_id = $1 AND (
        s.pickup_stop_id IN (SELECT id FROM stops WHERE route_id = ANY($2)) OR
        s.drop_stop_id IN (SELECT id FROM stops WHERE route_id = ANY($2))
      )
    `, [schoolId, route_ids]);
    userIds = rows.map(r => r.id);
  } else if (audience === 'drivers' && driver_ids?.length) {
    const { rows } = await query(`
      SELECT DISTINCT user_id AS id 
      FROM drivers 
      WHERE school_id = $1 AND id = ANY($2)
    `, [schoolId, driver_ids]);
    userIds = rows.map(r => r.id).filter(Boolean);
  }

  if (!userIds.length) {
    return { count: 0, message: 'No users found for the selected audience' };
  }

  // Insert into broadcasts table
  const { rows: broadcastRows } = await query(`
    INSERT INTO broadcasts (school_id, sender_id, title, body, type, audience, target_route_ids, target_driver_ids)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `, [schoolId, senderId, title, body, type, audience, route_ids || null, driver_ids || null]);
  const broadcastId = broadcastRows[0].id;

  const values = [];
  const queryParams = [];
  let paramCount = 1;
  for (const uid of userIds) {
    values.push(`($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++})`);
    queryParams.push(schoolId, uid, title, body, type, broadcastId);
  }

  await query(`
    INSERT INTO notifications (school_id, user_id, title, body, type, broadcast_id)
    VALUES ${values.join(', ')}
  `, queryParams);

  // Send push notifications
  try {
    const tokens = await resolvePushTokens(userIds);
    for (const token of tokens) {
      await sendPush({ token, title, body, data: { type } }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to send broadcast push notifications', err);
  }

  return { count: userIds.length, message: 'Broadcast sent successfully', userIds };
}

async function listBroadcasts(schoolId, { page, pageSize, offset }) {
  const { rows: countRows } = await query('SELECT COUNT(*)::int AS total FROM broadcasts WHERE school_id = $1', [schoolId]);
  const total = countRows[0].total;

  const { rows } = await query(`
    SELECT b.*, u.name as sender_name, u.email as sender_email
    FROM broadcasts b
    LEFT JOIN users u ON b.sender_id = u.id
    WHERE b.school_id = $1
    ORDER BY b.created_at DESC
    LIMIT $2 OFFSET $3
  `, [schoolId, pageSize, offset]);

  return { broadcasts: rows, pagination: paginationMeta(page, pageSize, total) };
}

async function updateBroadcast(schoolId, id, { title, body, type }) {
  const { rowCount } = await query(`
    UPDATE broadcasts SET title = $1, body = $2, type = $3 
    WHERE id = $4 AND school_id = $5
  `, [title, body, type, id, schoolId]);
  
  if (rowCount) {
    const { rows: updatedRows } = await query(`
      UPDATE notifications SET title = $1, body = $2, type = $3 
      WHERE broadcast_id = $4
      RETURNING user_id
    `, [title, body, type, id]);
    return { userIds: updatedRows.map(r => r.user_id) };
  } else {
    throw ApiError.notFound('Broadcast not found');
  }
}

async function deleteBroadcast(schoolId, id) {
  // Grab user_ids before deleting
  const { rows } = await query('SELECT user_id FROM notifications WHERE broadcast_id = $1', [id]);
  const userIds = rows.map(r => r.user_id);

  const { rowCount } = await query(`
    DELETE FROM broadcasts WHERE id = $1 AND school_id = $2
  `, [id, schoolId]);
  if (!rowCount) throw ApiError.notFound('Broadcast not found');
  
  return { userIds };
}

module.exports = {
  toResponse,
  list,
  unreadCount,
  createNotification,
  broadcastNotification,
  listBroadcasts,
  updateBroadcast,
  deleteBroadcast,
  markRead,
  markAllRead,
  remove,
};
