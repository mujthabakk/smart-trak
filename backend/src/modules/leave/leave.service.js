const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');

// route_name/parent_phone follow students.service.js's BASE_SELECT display
// pattern (pickup route falling back to drop route) — display-only, not used
// for any membership/containment logic.
const BASE_SELECT = `
  SELECT lv.*, s.name AS student_name, s.class AS student_class,
    COALESCE(pr.name, dr.name) AS route_name,
    (SELECT phone FROM parent_details WHERE student_id = s.id ORDER BY created_at ASC LIMIT 1) AS parent_phone
  FROM leaves lv
  JOIN students s ON s.id = lv.student_id
  LEFT JOIN stops ps ON ps.id = s.pickup_stop_id
  LEFT JOIN routes pr ON pr.id = ps.route_id
  LEFT JOIN stops ds ON ds.id = s.drop_stop_id
  LEFT JOIN routes dr ON dr.id = ds.route_id
`;

function toResponse(row) {
  return {
    id: row.id,
    student_id: row.student_id,
    student_name: row.student_name,
    student_class: row.student_class || undefined,
    route_name: row.route_name || undefined,
    parent_phone: row.parent_phone || undefined,
    school_id: row.school_id,
    from_date: row.from_date,
    to_date: row.to_date,
    shift: row.shift || undefined,
    reason: row.reason || undefined,
    status: row.status,
    approved_by: row.approved_by || undefined,
    approved_at: row.approved_at || undefined,
    created_at: row.created_at,
  };
}

/** Confirms a student exists and (when scoped) belongs to schoolId. */
async function assertStudentInScope(studentId, schoolId) {
  const params = schoolId ? [studentId, schoolId] : [studentId];
  const where = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
  const { rows } = await query(`SELECT id FROM students WHERE ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('Student not found');
}

/** A student "belongs" to a parent when the parent's login email matches an
 * email on file in parent_details for that student (same match used by the
 * students module — parent accounts are provisioned with that same email). */
function parentChildCondition(studentIdColumn, paramIndex) {
  return `EXISTS (
    SELECT 1 FROM parent_details pd
    JOIN users u ON lower(u.email) = lower(pd.email)
    WHERE pd.student_id = ${studentIdColumn} AND u.id = $${paramIndex}
  )`;
}

/** Throws unless the student is one of this parent's own children. */
async function assertStudentBelongsToParent(studentId, parentUserId) {
  const { rows } = await query(
    `SELECT 1 FROM parent_details pd
     JOIN users u ON lower(u.email) = lower(pd.email)
     WHERE pd.student_id = $1 AND u.id = $2`,
    [studentId, parentUserId]
  );
  if (!rows[0]) throw ApiError.forbidden('You may only request leave for your own child');
}

async function list(schoolId, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`lv.school_id = $${params.length}`);
  }
  if (filters.student_id) {
    params.push(filters.student_id);
    conditions.push(`lv.student_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`lv.status = $${params.length}`);
  }
  // Date-range overlap: a leave [from_date, to_date] overlaps the requested
  // window [from, to] when it starts before the window ends and ends after
  // the window begins.
  if (filters.from) {
    params.push(filters.from);
    conditions.push(`lv.to_date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`lv.from_date <= $${params.length}`);
  }
  // Exact-day containment, for the admin dashboard's date-picker screens
  // (distinct from from/to's range-overlap use by the parent's leave list).
  if (filters.date) {
    params.push(filters.date);
    const idx = params.length;
    conditions.push(`lv.from_date <= $${idx} AND lv.to_date >= $${idx}`);
  }
  // A 'full_day' leave counts toward both the morning and afternoon groups.
  if (filters.shift) {
    params.push(filters.shift);
    conditions.push(`(lv.shift = $${params.length} OR lv.shift = 'full_day')`);
  }
  if (filters.parentUserId) {
    params.push(filters.parentUserId);
    conditions.push(parentChildCondition('lv.student_id', params.length));
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM leaves lv ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY lv.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { leaves: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, schoolId, parentUserId) {
  const conditions = ['lv.id = $1'];
  const params = [id];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`lv.school_id = $${params.length}`);
  }
  if (parentUserId) {
    params.push(parentUserId);
    conditions.push(parentChildCondition('lv.student_id', params.length));
  }
  const { rows } = await query(`${BASE_SELECT} WHERE ${conditions.join(' AND ')}`, params);
  if (!rows[0]) throw ApiError.notFound('Leave request not found');
  return toResponse(rows[0]);
}

async function create(schoolId, data, parentUserId) {
  await assertStudentInScope(data.student_id, schoolId);
  if (parentUserId) await assertStudentBelongsToParent(data.student_id, parentUserId);
  const { rows } = await query(
    `INSERT INTO leaves (student_id, school_id, from_date, to_date, shift, reason, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id`,
    [data.student_id, schoolId, data.from_date, data.to_date, data.shift || null, data.reason || null]
  );
  return getById(rows[0].id, schoolId);
}

/**
 * Updates a leave request. When status transitions to 'approved' or
 * 'rejected', stamps approved_by/approved_at with the acting user — the
 * controller has already verified the caller is an admin before status is
 * present in the body.
 */
async function update(id, schoolId, data, actingUserId) {
  const existing = await getById(id, schoolId);
  const sets = [];
  const params = [];
  for (const field of ['from_date', 'to_date', 'shift', 'reason']) {
    if (data[field] !== undefined) {
      params.push(data[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }
  if (data.status !== undefined && data.status !== existing.status) {
    params.push(data.status);
    sets.push(`status = $${params.length}`);
    if (data.status === 'approved' || data.status === 'rejected') {
      params.push(actingUserId);
      sets.push(`approved_by = $${params.length}`);
      sets.push(`approved_at = now()`);
    }
  }
  if (sets.length === 0) return existing;
  params.push(id);
  await query(`UPDATE leaves SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return getById(id, schoolId);
}

async function remove(id, schoolId, parentUserId) {
  if (parentUserId) {
    // Re-use getById's ownership check so a parent deleting someone else's
    // leave request 404s (no existence leak) instead of a bare delete no-op.
    await getById(id, schoolId, parentUserId);
  }
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
  const { rowCount } = await query(`DELETE FROM leaves WHERE ${where}`, params);
  if (!rowCount) throw ApiError.notFound('Leave request not found');
}

module.exports = { list, getById, create, update, remove };
