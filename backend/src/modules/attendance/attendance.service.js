const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');
const { createNotification } = require('../notifications/notifications.service');

function formatDateString(d) {
  if (!d) return d;
  if (typeof d === 'string' && !d.includes('T')) return d.slice(0, 10);
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return d;
}

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
    offboard_status: row.offboard_status || undefined,
    offboard_reason: row.offboard_reason || undefined,
    route_name: row.route_name || undefined,
    date: formatDateString(row.date),
  };
}

/** Confirms a student exists and (when scoped) belongs to schoolId. */
async function assertStudentInScope(studentId, schoolId) {
  const params = schoolId ? [studentId, schoolId] : [studentId];
  const where = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
  const { rows } = await query(`SELECT id FROM students WHERE ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('Student not found');
}

/** trip_id for a given attendance record — used to apply driver-ownership checks on update/remove. */
async function getTripIdForRecord(id) {
  const { rows } = await query('SELECT trip_id FROM attendance_records WHERE id = $1', [id]);
  if (!rows[0]) throw ApiError.notFound('Attendance record not found');
  return rows[0].trip_id;
}

async function findStudentByQrCode(qrCode, schoolId) {
  const where = schoolId ? 'student_qr_code = $1 AND school_id = $2' : 'student_qr_code = $1';
  const params = schoolId ? [qrCode, schoolId] : [qrCode];
  const { rows } = await query(`SELECT id FROM students WHERE ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('No student found for this QR code');
  return rows[0];
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
  if (filters.driver_id) {
    params.push(filters.driver_id);
    conditions.push(`t.driver_id = $${params.length}`);
  }
  if (filters.parentUserId) {
    // Restricts results to attendance for the caller's own children, matched by
    // the parent's login email against parent_details.email (see students module).
    params.push(filters.parentUserId);
    conditions.push(`EXISTS (
      SELECT 1 FROM parent_details pd
      JOIN users u ON lower(u.email) = lower(pd.email)
      WHERE pd.student_id = s.id AND u.id = $${params.length}
    )`);
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
    `SELECT COUNT(*)::int AS total FROM attendance_records ar
       JOIN students s ON s.id = ar.student_id
       LEFT JOIN trips t ON t.id = ar.trip_id
     ${where}`,
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

async function markAttendance(schoolId, data) {
  const ids = await withTransaction(async (client) => {
    const created = [];
    for (const rec of data.records) {
      const studentParams = schoolId ? [rec.student_id, schoolId] : [rec.student_id];
      const studentWhere = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
      const { rows: studentRows } = await client.query(`SELECT id FROM students WHERE ${studentWhere}`, studentParams);
      if (!studentRows[0]) throw ApiError.notFound(`Student ${rec.student_id} not found`);

      const { rows } = await client.query(
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
          rec.student_id,
          rec.stop_id || null,
          rec.status,
          data.pickup_time || null,
          data.drop_time || null,
          data.date || null,
        ]
      );
      created.push(rows[0].id);
    }
    return created;
  });
  return Promise.all(ids.map((id) => getById(id, schoolId)));
}

/** Scan-to-attendance: resolves the student by QR code, then marks them present
 * for the trip, stamping pickup_time or drop_time depending on the trip's type. */
async function markByQrCode(schoolId, tripId, qrCode, stopId) {
  const student = await findStudentByQrCode(qrCode, schoolId);
  const { rows: tripRows } = await query('SELECT trip_type FROM trips WHERE id = $1', [tripId]);
  if (!tripRows[0]) throw ApiError.notFound('Trip not found');

  const now = new Date().toISOString();
  return (await markAttendance(schoolId, {
    trip_id: tripId,
    pickup_time: tripRows[0].trip_type === 'pickup' ? now : undefined,
    drop_time: tripRows[0].trip_type === 'drop' ? now : undefined,
    records: [
      {
        student_id: student.id,
        stop_id: stopId || null,
        status: 'present',
      }
    ]
  }))[0];
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

async function bulkOffboard(schoolId, tripId, records) {
  const ids = await withTransaction(async (client) => {
    const updated = [];
    for (const rec of records) {
      const recordParams = schoolId ? [rec.attendance_id, tripId, schoolId] : [rec.attendance_id, tripId];
      const recordWhere = schoolId ? 'ar.id = $1 AND ar.trip_id = $2 AND s.school_id = $3' : 'ar.id = $1 AND ar.trip_id = $2';
      
      const { rows: recordRows } = await client.query(
        `SELECT ar.id FROM attendance_records ar
         JOIN students s ON s.id = ar.student_id
         WHERE ${recordWhere}`,
        recordParams
      );
      if (!recordRows[0]) throw ApiError.notFound(`Attendance record ${rec.attendance_id} not found for this trip`);

      const dropTime = rec.drop_time || (rec.offboard_status === 'offboarded' ? new Date().toISOString() : null);

      await client.query(
        `UPDATE attendance_records SET
           offboard_status = $1,
           offboard_reason = $2,
           drop_time = COALESCE($3, drop_time)
         WHERE id = $4`,
        [rec.offboard_status, rec.offboard_reason || null, dropTime, rec.attendance_id]
      );
      updated.push(rec.attendance_id);
    }
    return updated;
  });
  return Promise.all(ids.map((id) => getById(id, schoolId)));
}

async function update(id, schoolId, data) {
  await getById(id, schoolId);
  const fields = ['status', 'stop_id', 'pickup_time', 'drop_time', 'offboard_status', 'offboard_reason'];
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

async function notifyParentsForAttendance(records, tripType) {
  for (const rec of records) {
    if (rec.status !== 'present') continue;
    
    // Find parent(s)
    const { rows: parentRows } = await query(`
      SELECT u.id, s.name as student_name, s.school_id 
      FROM parent_details pd
      JOIN users u ON lower(u.email) = lower(pd.email)
      JOIN students s ON s.id = pd.student_id
      WHERE pd.student_id = $1
    `, [rec.student_id]);
    
    for (const parent of parentRows) {
      await createNotification({
        school_id: parent.school_id,
        user_id: parent.id,
        title: 'Attendance Update',
        body: `${parent.student_name} is inside the bus for the ${tripType === 'pickup' ? 'pickup' : 'drop'} trip.`,
        type: 'attendance',
      });
    }
  }
}

// Screen labels only — derived from data we actually store (trips.trip_type,
// trips.status), never invented fields. pickup -> "Morning Trip"/drop ->
// "Afternoon Trip" matches how the mobile Attendance screen groups the day;
// not_started/in_progress/completed map to the same wording the Bus Status
// page already uses for a trip's progress.
const TRIP_LABELS = { pickup: 'Morning Trip', drop: 'Afternoon Trip' };
const BUS_STATUS_LABELS = { not_started: 'not_started', in_progress: 'on_route', completed: 'reached' };

/**
 * Assembles the parent app's per-day Attendance screen: one card per trip
 * type (pickup/drop) run on the student's own route for the given date,
 * combining that trip's status with the student's attendance record for it
 * (if attendance has been marked yet — a trip that hasn't reached this
 * student's stop returns trip_status/bus_status_label with no
 * attendance_status/time).
 */
async function getDaySummary(schoolId, studentId, date, parentUserId) {
  const params = [studentId];
  const conditions = ['s.id = $1'];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`s.school_id = $${params.length}`);
  }
  if (parentUserId) {
    // Same ownership check used by list()'s filters.parentUserId — a parent
    // can only pull the day summary for their own child.
    params.push(parentUserId);
    conditions.push(`EXISTS (
      SELECT 1 FROM parent_details pd
      JOIN users u ON lower(u.email) = lower(pd.email)
      WHERE pd.student_id = s.id AND u.id = $${params.length}
    )`);
  }

  const { rows: studentRows } = await query(
    `SELECT s.id, s.name, ps.route_id AS pickup_route_id, ds.route_id AS drop_route_id
     FROM students s
     LEFT JOIN stops ps ON ps.id = s.pickup_stop_id
     LEFT JOIN stops ds ON ds.id = s.drop_stop_id
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  if (!studentRows[0]) throw ApiError.notFound('Student not found');
  const student = studentRows[0];

  const routeIds = [...new Set([student.pickup_route_id, student.drop_route_id].filter(Boolean))];
  const dateStr = formatDateString(date);
  if (!routeIds.length) {
    return { student_id: student.id, student_name: student.name, date: dateStr, trips: [] };
  }

  const { rows: tripRows } = await query(
    `SELECT id, trip_type, status AS trip_status
     FROM trips WHERE route_id = ANY($1) AND trip_date = $2
     ORDER BY trip_type`,
    [routeIds, dateStr]
  );

  let attendanceByTrip = {};
  if (tripRows.length) {
    const { rows: attRows } = await query(
      `SELECT ar.trip_id, ar.status, ar.pickup_time, ar.drop_time, st.name AS stop_name
       FROM attendance_records ar
       LEFT JOIN stops st ON st.id = ar.stop_id
       WHERE ar.student_id = $1 AND ar.trip_id = ANY($2)`,
      [studentId, tripRows.map((t) => t.id)]
    );
    attendanceByTrip = Object.fromEntries(attRows.map((r) => [r.trip_id, r]));
  }

  const trips = tripRows.map((t) => {
    const att = attendanceByTrip[t.id];
    return {
      trip_id: t.id,
      trip_type: t.trip_type,
      label: TRIP_LABELS[t.trip_type] || t.trip_type,
      stop_name: att?.stop_name || undefined,
      attendance_status: att?.status || undefined,
      time: (t.trip_type === 'pickup' ? att?.pickup_time : att?.drop_time) || undefined,
      trip_status: t.trip_status,
      bus_status_label: BUS_STATUS_LABELS[t.trip_status] || t.trip_status,
    };
  });

  return { student_id: student.id, student_name: student.name, date: dateStr, trips };
}

module.exports = {
  list,
  getById,
  getTripIdForRecord,
  markAttendance,
  markByQrCode,
  bulkMark,
  bulkOffboard,
  update,
  remove,
  notifyParentsForAttendance,
  getDaySummary,
};
