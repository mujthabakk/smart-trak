const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');

const BASE_SELECT = `
  SELECT a.*, u.name AS user_name, sc.name AS school_name
  FROM audit_logs a
  LEFT JOIN users u ON u.id = a.user_id
  LEFT JOIN schools sc ON sc.id = a.school_id
`;

function toResponse(row) {
  return {
    id: row.id,
    user_id: row.user_id || undefined,
    user_name: row.user_name || undefined,
    school_id: row.school_id || undefined,
    school_name: row.school_name || undefined,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id || undefined,
    details: row.details,
    created_at: row.created_at,
  };
}

/** super_admin sees every log (optionally filtered by ?school_id=); school_admin
 * is pinned to their own school's log trail. */
async function list(user, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];

  if (user.role === 'super_admin') {
    if (filters.school_id) {
      params.push(filters.school_id);
      conditions.push(`a.school_id = $${params.length}`);
    }
  } else {
    params.push(user.school_id || null);
    conditions.push(`a.school_id = $${params.length}`);
  }

  if (filters.entity_type) {
    params.push(filters.entity_type);
    conditions.push(`a.entity_type = $${params.length}`);
  }
  if (filters.user_id) {
    params.push(filters.user_id);
    conditions.push(`a.user_id = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`a.created_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`a.created_at <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM audit_logs a ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY a.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { logs: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, user) {
  const { rows } = await query(`${BASE_SELECT} WHERE a.id = $1`, [id]);
  const row = rows[0];
  if (!row) throw ApiError.notFound('Audit log not found');
  if (user.role !== 'super_admin' && row.school_id !== user.school_id) {
    throw ApiError.notFound('Audit log not found');
  }
  return toResponse(row);
}

/**
 * Internal helper for other modules to record an audit entry as a side effect
 * of their own actions, e.g.:
 *   const { recordAudit } = require('../auditLogs/auditLogs.service');
 *   await recordAudit({ user_id: req.user.id, school_id: schoolId, action: 'bus.create',
 *     entity_type: 'bus', entity_id: bus.id, details: { bus_number: bus.bus_number } });
 * Not exposed over HTTP — audit_logs is read-only via the API.
 */
async function recordAudit({ user_id, school_id, action, entity_type, entity_id, details }) {
  await query(
    `INSERT INTO audit_logs (user_id, school_id, action, entity_type, entity_id, details)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [user_id || null, school_id || null, action, entity_type, entity_id || null, details || null]
  );
}

module.exports = { list, getById, recordAudit };
