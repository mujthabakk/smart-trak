const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');
const { sendPush } = require('../../utils/push');
const { sendVoipPush } = require('../../utils/voipPush');

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

/** Resolves push devices for a batch of users — prefers each user's registered
 * fcm_tokens rows (one per device_id — see auth.service.js's
 * registerDeviceToken, which upserts by device_id so multiple devices logged
 * into the same account each keep their own row and all of them get pushed
 * to); falls back to the legacy users.fcm_token column only for a user with
 * zero rows in fcm_tokens, so accounts that haven't moved to the per-device
 * registration flow yet still receive pushes (FCM-only — legacy rows carry
 * no platform/voip_token, so they can never be routed to a VoIP push). Each
 * returned device carries platform + voip_token alongside the fcm token so
 * dispatchPush() can decide FCM vs. PushKit per device. */
async function resolvePushTokens(userIds) {
  if (!userIds.length) return [];
  const { rows: deviceRows } = await query(
    'SELECT user_id, token, voip_token, platform FROM fcm_tokens WHERE user_id = ANY($1)',
    [userIds]
  );
  const usersWithDeviceTokens = new Set(deviceRows.map((r) => r.user_id));
  const legacyUserIds = userIds.filter((id) => !usersWithDeviceTokens.has(id));
  let legacyDevices = [];
  if (legacyUserIds.length) {
    const { rows } = await query(
      'SELECT id AS user_id, fcm_token AS token FROM users WHERE id = ANY($1) AND fcm_token IS NOT NULL',
      [legacyUserIds]
    );
    legacyDevices = rows.map((r) => ({ user_id: r.user_id, token: r.token, voip_token: null, platform: null }));
  }
  return [
    ...deviceRows.map((r) => ({ user_id: r.user_id, token: r.token, voip_token: r.voip_token || null, platform: r.platform || null })),
    ...legacyDevices,
  ];
}

/**
 * Sends one push to one device, routing iOS full-screen ringing to a direct
 * PushKit VoIP push instead of FCM — the spec these push routes follow is
 * explicit that a device must never get both (CallKit + a banner at once).
 * Any other case (Android of any type, iOS normal/alert/warning, or iOS
 * ringing with no voip_token yet registered) goes through the regular FCM
 * path, the last case as a deliberate degraded fallback (banner only) rather
 * than silence.
 */
async function dispatchPush(device, { title, body, type, id, extraData }) {
  const isRinging = String(type || '').toLowerCase() === 'ringing';
  if (device.platform === 'ios' && isRinging && device.voip_token) {
    return sendVoipPush({ voipToken: device.voip_token, title, body, type, id });
  }
  return sendPush({ token: device.token, title, body, data: { type, id, ...extraData } });
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
 * school_id and action_url are optional; the rest are required. `type` is
 * the in-app inbox category and must be one of notifications.type's fixed
 * values (info/warning/success/error/emergency/leave/attendance/message/
 * system) — it is NOT the push sound/channel. Pass `push_type` separately
 * when the push should ring/alert differently than its inbox category
 * implies (e.g. a routine 'info' row that should still ring the phone —
 * see alerts.service.js's "Bus approaching"); it defaults to `type`.
 */
async function createNotification({ school_id, user_id, title, body, type, action_url, push_type }) {
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
      const devices = await resolvePushTokens([user_id]);
      await Promise.all(devices.map((device) => dispatchPush(device, {
        title, body, type: push_type || type, id: rows[0].id, extraData: { action_url },
      })));
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
      JOIN users u ON lower(u.email) = lower(p.email)
      JOIN students s ON s.id = p.student_id
      WHERE s.school_id = $1
    `, [schoolId]);
    userIds = rows.map(r => r.id);
  } else if (audience === 'specific_route' && route_ids?.length) {
    const { rows } = await query(`
      SELECT DISTINCT u.id
      FROM students s
      JOIN parent_details p ON p.student_id = s.id
      JOIN users u ON lower(u.email) = lower(p.email)
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

  const { rows: insertedRows } = await query(`
    INSERT INTO notifications (school_id, user_id, title, body, type, broadcast_id)
    VALUES ${values.join(', ')}
    RETURNING id, user_id
  `, queryParams);
  const idByUser = new Map(insertedRows.map((r) => [r.user_id, r.id]));

  // Send push notifications
  try {
    const devices = await resolvePushTokens(userIds);
    for (const device of devices) {
      await dispatchPush(device, { title, body, type, id: idByUser.get(device.user_id) }).catch(() => {});
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
