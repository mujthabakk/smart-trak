const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');

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

module.exports = {
  toResponse,
  list,
  unreadCount,
  createNotification,
  markRead,
  markAllRead,
  remove,
};
