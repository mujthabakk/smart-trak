const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');

const BASE_SELECT = `
  SELECT m.*, u.name AS sender_name, u.role AS sender_role
  FROM messages m
  JOIN users u ON u.id = m.sender_id
`;

function toResponse(row, recipientName) {
  return {
    id: row.id,
    school_id: row.school_id || undefined,
    sender_id: row.sender_id,
    sender_name: row.sender_name,
    sender_role: row.sender_role,
    recipient_type: row.recipient_type,
    recipient_id: row.recipient_id || undefined,
    recipient_name: recipientName || undefined,
    content: row.content,
    sent_at: row.sent_at || undefined,
    read_at: row.read_at || undefined,
    is_scheduled: row.is_scheduled,
    scheduled_at: row.scheduled_at || undefined,
    created_at: row.created_at,
  };
}

/**
 * Best-effort recipient display name for 'individual' / 'driver' messages.
 * Group recipient types (all_parents, route_parents, all_drivers, admin) have
 * no single recipient to resolve, so they always return undefined.
 *
 * Parents aren't full user accounts in this schema yet, so recipient_id for an
 * 'individual' message may point at a users row, a students row, or a
 * parent_details row depending on who/what the admin targeted. We try `users`
 * first (covers admins/parents that do have accounts), then fall back to
 * `students`/`parent_details`. 'driver' messages are tried against `users`
 * first (a driver with a login), then `drivers` (driver records without one).
 * If nothing matches, recipient_name is left undefined rather than erroring —
 * this is a display nicety, not a referential-integrity guarantee.
 */
async function resolveRecipientName(recipientType, recipientId) {
  if (!recipientId || (recipientType !== 'individual' && recipientType !== 'driver')) {
    return undefined;
  }

  const { rows: userRows } = await query('SELECT name FROM users WHERE id = $1', [recipientId]);
  if (userRows[0]) return userRows[0].name;

  if (recipientType === 'driver') {
    const { rows: driverRows } = await query('SELECT name FROM drivers WHERE id = $1', [recipientId]);
    if (driverRows[0]) return driverRows[0].name;
    return undefined;
  }

  const { rows: studentRows } = await query('SELECT name FROM students WHERE id = $1', [recipientId]);
  if (studentRows[0]) return studentRows[0].name;

  const { rows: parentRows } = await query('SELECT parent_name FROM parent_details WHERE id = $1', [recipientId]);
  if (parentRows[0]) return parentRows[0].parent_name;

  return undefined;
}

async function rowToMessage(row) {
  const recipientName = await resolveRecipientName(row.recipient_type, row.recipient_id);
  return toResponse(row, recipientName);
}

async function list(schoolId, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`m.school_id = $${params.length}`);
  }
  if (filters.sender_id) {
    params.push(filters.sender_id);
    conditions.push(`m.sender_id = $${params.length}`);
  }
  if (filters.recipient_type) {
    params.push(filters.recipient_type);
    conditions.push(`m.recipient_type = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM messages m ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY m.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const messages = await Promise.all(rows.map(rowToMessage));
  return { messages, pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'WHERE m.id = $1 AND m.school_id = $2' : 'WHERE m.id = $1';
  const { rows } = await query(`${BASE_SELECT} ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('Message not found');
  return rowToMessage(rows[0]);
}

/**
 * Creates/sends a message. If is_scheduled is true and scheduled_at is in the
 * future, sent_at is left NULL (not sent yet) — there is no background job
 * scheduler in this scope to flip it over at the scheduled time; a future
 * module would need to poll for due messages and set sent_at = now() then.
 * Otherwise (not scheduled, or scheduled_at already due) sent_at is set now.
 */
async function create(data) {
  const scheduledForFuture = Boolean(
    data.is_scheduled && data.scheduled_at && new Date(data.scheduled_at).getTime() > Date.now()
  );

  const { rows } = await query(
    `INSERT INTO messages (school_id, sender_id, recipient_type, recipient_id, content, sent_at, is_scheduled, scheduled_at)
     VALUES ($1,$2,$3,$4,$5, ${scheduledForFuture ? 'NULL' : 'now()'}, $6, $7)
     RETURNING id`,
    [
      data.school_id || null,
      data.sender_id,
      data.recipient_type,
      data.recipient_id || null,
      data.content,
      Boolean(data.is_scheduled),
      data.scheduled_at || null,
    ]
  );
  return getById(rows[0].id, null);
}

async function remove(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
  const { rowCount } = await query(`DELETE FROM messages WHERE ${where}`, params);
  if (!rowCount) throw ApiError.notFound('Message not found');
}

module.exports = { toResponse, list, getById, create, remove };
