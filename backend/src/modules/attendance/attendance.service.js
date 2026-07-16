const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');

// attendance_records has no school_id column of its own — tenant scoping is
// enforced by joining students (the FK that does carry school_id).
const BASE_SELECT = `
  SELECT ar.*, s.name AS student_name, s.class AS student_class, s.school_id AS student_school_id,
    st.name AS stop_name,
    r.name AS route_name
  FROM attendance_records ar
  JOIN students s ON s.id = ar.student_id
  LEFT JOIN stops st ON st.id = ar.stop_id
  LEFT JOIN trips t ON t.id = ar.trip_id
  LEFT JOIN routes r ON r.id = t.route_id
`;

function toResponse(row) {
  return {
    id: row.id,
    trip_id: row.trip_id,
    student_id: row.student_id,
    student_name: row.student_name,
    student_class: row.student_class,
    stop_id: row.stop_id || undefined,
    stop_name: row.stop_name || undefined,
    status: row.status,
    pickup_time: row.pickup_time || undefined,
    drop_time: row.drop_time || undefined,
    route_name: row.route_name || undefined,
    date: row.date,
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
    conditions.push(`s.school_id = $${params.length}`);
  }
  if (filters.trip_id) {
    params.push(filters.trip_id);
    conditions.push(`ar.trip_id = $${params.length}`);
  }
  if (filters.student_id) {
    params.push(filters.student_id);
    conditions.push(`ar.student_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`ar.status = $${params.length}`);
  }
  if (filters.date) {
    params.push(filters.date);
    conditions.push(`ar.date = $${params.length}`);
  } else if (!filters.trip_id) {
    // Default to today's attendance when neither a specific date nor a specific
    // trip is requested — matches an "Attendance.tsx" dashboard's default view.
    // (Skipped when trip_id is given so looking up a past trip's roster still works.)
    conditions.push(`ar.date = CURRENT_DATE`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM attendance_records ar JOIN students s ON s.id = ar.student_id ${where}`,
    params
  );
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY ar.date DESC, ar.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { records: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'WHERE ar.id = $1 AND s.school_id = $2' : 'WHERE ar.id = $1';
  const { rows } = await query(`${BASE_SELECT} ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('Attendance record not found');
  return toResponse(rows[0]);
}

/**
 * Marks attendance for one student on one trip. QR-scan flows call this
 * repeatedly (pickup scan, then drop scan, or a re-scan correction) so a
 * second call for the same (trip_id, student_id) upserts rather than erroring
 * — the UNIQUE(trip_id, student_id) constraint backs the ON CONFLICT clause.
 */
async function markAttendance(schoolId, data) {
  await assertStudentInScope(data.student_id, schoolId);
  const { rows } = await query(
    `INSERT INTO attendance_records (trip_id, student_id, stop_id, status, pickup_time, drop_time, date)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, CURRENT_DATE))
     ON CONFLICT (trip_id, student_id) DO UPDATE SET
       status = EXCLUDED.status,
       stop_id = COALESCE(EXCLUDED.stop_id, attendance_records.stop_id),
       pickup_time = COALESCE(EXCLUDED.pickup_time, attendance_records.pickup_time),
       drop_time = COALESCE(EXCLUDED.drop_time, attendance_records.drop_time)
     RETURNING id`,
    [
      data.trip_id,
      data.student_id,
      data.stop_id || null,
      data.status,
      data.pickup_time || null,
      data.drop_time || null,
      data.date || null,
    ]
  );
  return getById(rows[0].id, schoolId);
}

/** Marks a whole trip's roster at once (school admin "mark all" flow), upserting each row in a transaction. */
async function bulkMark(schoolId, tripId, records) {
  const ids = await withTransaction(async (client) => {
    const created = [];
    for (const rec of records) {
      const studentParams = schoolId ? [rec.student_id, schoolId] : [rec.student_id];
      const studentWhere = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
      const { rows: studentRows } = await client.query(`SELECT id FROM students WHERE ${studentWhere}`, studentParams);
      if (!studentRows[0]) throw ApiError.notFound(`Student ${rec.student_id} not found`);

      const { rows } = await client.query(
        `INSERT INTO attendance_records (trip_id, student_id, stop_id, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (trip_id, student_id) DO UPDATE SET
           status = EXCLUDED.status,
           stop_id = COALESCE(EXCLUDED.stop_id, attendance_records.stop_id)
         RETURNING id`,
        [tripId, rec.student_id, rec.stop_id || null, rec.status]
      );
      created.push(rows[0].id);
    }
    return created;
  });
  return Promise.all(ids.map((id) => getById(id, schoolId)));
}

async function update(id, schoolId, data) {
  await getById(id, schoolId);
  const fields = ['status', 'stop_id', 'pickup_time', 'drop_time'];
  const sets = [];
  const params = [];
  for (const field of fields) {
    if (data[field] !== undefined) {
      params.push(data[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getById(id, schoolId);
  params.push(id);
  await query(`UPDATE attendance_records SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return getById(id, schoolId);
}

async function remove(id, schoolId) {
  // attendance_records has no school_id column, so tenant scope is verified
  // via the students join before deleting by primary key.
  await getById(id, schoolId);
  const { rowCount } = await query('DELETE FROM attendance_records WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('Attendance record not found');
}

module.exports = { list, getById, markAttendance, bulkMark, update, remove };
