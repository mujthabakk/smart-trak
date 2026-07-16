const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');

const BASE_SELECT = `
  SELECT lv.*, s.name AS student_name, s.class AS student_class
  FROM leaves lv
  JOIN students s ON s.id = lv.student_id
`;

function toResponse(row) {
  return {
    id: row.id,
    student_id: row.student_id,
    student_name: row.student_name,
    student_class: row.student_class || undefined,
    school_id: row.school_id,
    from_date: row.from_date,
    to_date: row.to_date,
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

async function getById(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'WHERE lv.id = $1 AND lv.school_id = $2' : 'WHERE lv.id = $1';
  const { rows } = await query(`${BASE_SELECT} ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('Leave request not found');
  return toResponse(rows[0]);
}

async function create(schoolId, data) {
  await assertStudentInScope(data.student_id, schoolId);
  const { rows } = await query(
    `INSERT INTO leaves (student_id, school_id, from_date, to_date, reason, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id`,
    [data.student_id, schoolId, data.from_date, data.to_date, data.reason || null]
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
  for (const field of ['from_date', 'to_date', 'reason']) {
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

async function remove(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
  const { rowCount } = await query(`DELETE FROM leaves WHERE ${where}`, params);
  if (!rowCount) throw ApiError.notFound('Leave request not found');
}

module.exports = { list, getById, create, update, remove };
