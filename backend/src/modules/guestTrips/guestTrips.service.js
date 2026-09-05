const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');

function toResponse(row) {
  return {
    id: row.id,
    school_id: row.school_id,
    guest_driver_name: row.guest_driver_name,
    guest_driver_phone: row.guest_driver_phone,
    bus_registration: row.bus_registration,
    status: row.status,
    approved_by: row.approved_by || undefined,
    started_at: row.started_at || undefined,
    ended_at: row.ended_at || undefined,
    created_at: row.created_at,
  };
}

/** Projection of students table shape expected on GuestTrip.students:
 * {id, name, class, division, status, marked_at}. status/marked_at come from
 * guest_trip_students, this trip's own lightweight attendance record — not
 * the real attendance_records table (a guest trip never touches it). */
async function getStudentsForTrip(guestTripId) {
  const { rows } = await query(
    `SELECT s.id, s.name, s.class, s.division, gts.status, gts.marked_at
     FROM guest_trip_students gts
     JOIN students s ON s.id = gts.student_id
     WHERE gts.guest_trip_id = $1
     ORDER BY s.name`,
    [guestTripId]
  );
  return rows.map((r) => ({ ...r, marked_at: r.marked_at || undefined }));
}

/** Batches the student join for a page of trips so list() doesn't N+1 query. */
async function getStudentsForTrips(tripIds) {
  if (tripIds.length === 0) return {};
  const { rows } = await query(
    `SELECT gts.guest_trip_id, s.id, s.name, s.class, s.division, gts.status, gts.marked_at
     FROM guest_trip_students gts
     JOIN students s ON s.id = gts.student_id
     WHERE gts.guest_trip_id = ANY($1::text[])
     ORDER BY s.name`,
    [tripIds]
  );
  const grouped = {};
  for (const row of rows) {
    (grouped[row.guest_trip_id] ||= []).push({
      id: row.id, name: row.name, class: row.class, division: row.division,
      status: row.status, marked_at: row.marked_at || undefined,
    });
  }
  return grouped;
}

async function list(schoolId, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`school_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filters.phone) {
    params.push(filters.phone);
    conditions.push(`guest_driver_phone = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM guest_trips ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `SELECT * FROM guest_trips ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const studentsByTrip = await getStudentsForTrips(rows.map((r) => r.id));
  const trips = rows.map((row) => ({ ...toResponse(row), students: studentsByTrip[row.id] || [] }));

  return { trips, pagination: paginationMeta(page, pageSize, total) };
}

/**
 * `ownerPhone`, when passed, additionally requires guest_driver_phone to match —
 * used to scope a guest_driver caller to their own trips (matched the same way
 * create() establishes the link: by the caller's own phone, not a client-supplied one).
 * A mismatch 404s rather than 403, consistent with tickets/notifications.
 */
async function getById(id, schoolId, ownerPhone) {
  const conditions = ['id = $1'];
  const params = [id];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`school_id = $${params.length}`);
  }
  if (ownerPhone) {
    params.push(ownerPhone);
    conditions.push(`guest_driver_phone = $${params.length}`);
  }
  const { rows } = await query(`SELECT * FROM guest_trips WHERE ${conditions.join(' AND ')}`, params);
  if (!rows[0]) throw ApiError.notFound('Guest trip not found');
  const students = await getStudentsForTrip(rows[0].id);
  return { ...toResponse(rows[0]), students };
}

/** Bulk-inserts guest_trip_students rows in a transaction (mirrors buses.createMany). */
async function create(schoolId, data) {
  const id = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO guest_trips (school_id, guest_driver_name, guest_driver_phone, bus_registration)
       VALUES ($1,$2,$3,$4)
       RETURNING id`,
      [schoolId, data.guest_driver_name, data.guest_driver_phone, data.bus_registration]
    );
    const tripId = rows[0].id;
    for (const studentId of data.student_ids || []) {
      await client.query(
        `INSERT INTO guest_trip_students (guest_trip_id, student_id) VALUES ($1, $2)`,
        [tripId, studentId]
      );
    }
    return tripId;
  });
  return getById(id, schoolId);
}

/**
 * status transitions:
 *  -> approved: stamp approved_by, and started_at (if not already set)
 *  -> completed: stamp ended_at
 * Role gating for who may set 'approved'/'rejected' is enforced in the controller.
 */
async function update(id, schoolId, data, actingUserId) {
  const current = await getById(id, schoolId);

  const sets = [];
  const params = [];

  if (data.status !== undefined) {
    params.push(data.status);
    sets.push(`status = $${params.length}`);

    if (data.status === 'approved') {
      params.push(actingUserId);
      sets.push(`approved_by = $${params.length}`);
      if (!current.started_at) {
        sets.push('started_at = now()');
      }
    }
    if (data.status === 'completed') {
      sets.push('ended_at = now()');
    }
  }

  for (const field of ['guest_driver_name', 'guest_driver_phone', 'bus_registration']) {
    if (data[field] !== undefined) {
      params.push(data[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }

  if (sets.length > 0) {
    params.push(id);
    await query(`UPDATE guest_trips SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  }

  return getById(id, schoolId);
}

/**
 * Marks present/absent for one or more of this guest trip's assigned
 * students. Only allowed once the trip is 'approved' (in flight) — marking
 * attendance before approval or after completion doesn't make sense.
 * `ownerPhone`, when passed, scopes to the caller's own trip the same way
 * getById does (404, not 403, on a mismatch).
 */
async function markAttendance(id, schoolId, records, ownerPhone) {
  const trip = await getById(id, schoolId, ownerPhone);
  if (trip.status !== 'approved') {
    throw ApiError.badRequest('Attendance can only be marked on an approved, in-progress guest trip');
  }

  const assignedIds = new Set(trip.students.map((s) => s.id));
  for (const record of records) {
    if (!assignedIds.has(record.student_id)) {
      throw ApiError.badRequest(`Student ${record.student_id} is not assigned to this guest trip`);
    }
    await query(
      `UPDATE guest_trip_students SET status = $1, marked_at = now()
       WHERE guest_trip_id = $2 AND student_id = $3`,
      [record.status, id, record.student_id]
    );
  }

  return getById(id, schoolId);
}

module.exports = { list, getById, create, update, markAttendance };
