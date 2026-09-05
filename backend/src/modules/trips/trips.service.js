const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');
const { createNotification } = require('../notifications/notifications.service');
const { todayInTimezone } = require('../../utils/timezone');
const { isGuestExpired } = require('../../utils/guestDriverExpiry');

/** Notifies every parent linked to a student on this route — same real
 * notifications-table + push path attendance.service.js's
 * notifyParentsForAttendance already uses, replacing the old
 * services/notifications.js mock (console.log only, never persisted, never
 * resolved a real push token). */
async function notifyRouteParents(schoolId, routeId, title, body) {
  const { rows: parentRows } = await query(`
    SELECT DISTINCT u.id AS user_id
    FROM students s
    JOIN parent_details p ON p.student_id = s.id
    JOIN users u ON u.email = p.email
    WHERE s.pickup_stop_id IN (SELECT id FROM stops WHERE route_id = $1)
       OR s.drop_stop_id IN (SELECT id FROM stops WHERE route_id = $1)
  `, [routeId]);

  // 'trip' isn't one of notifications.type's allowed values (see
  // 001_init.sql's CHECK constraint: info/warning/success/error/emergency/
  // leave/attendance/message/system) — 'info' is the closest generic fit.
  await Promise.all(parentRows.map((p) =>
    createNotification({ school_id: schoolId, user_id: p.user_id, title, body, type: 'info' })
      .catch((err) => console.error('Failed to notify parent for trip event', err))
  ));
}

// Trips have no direct school_id column — tenant scoping is derived through
// the route they belong to (routes.school_id), hence the join to routes here.
// student_count reuses the same "students whose pickup/drop stop belongs to
// the route's stops" logic as the routes module, joined through the trip's route_id.
const BASE_SELECT = `
  SELECT t.*, r.name AS route_name, r.school_id AS school_id, d.name AS driver_name,
    d.phone AS driver_phone, d.email AS driver_email, b.bus_number,
    (SELECT COUNT(*)::int FROM students st
       WHERE st.pickup_stop_id IN (SELECT id FROM stops WHERE route_id = t.route_id)
          OR st.drop_stop_id IN (SELECT id FROM stops WHERE route_id = t.route_id)
    ) AS student_count,
    -- How many of those students this trip has actually marked present so
    -- far — the numerator for the admin "Bus Status"/"Attendance" screens'
    -- "28/35 students" display.
    (SELECT COUNT(*)::int FROM attendance_records ar
       WHERE ar.trip_id = t.id AND ar.status = 'present'
    ) AS present_count,
    -- Bus's overall progress on this trip — the most recently marked stop,
    -- for any student, not GPS. Same "reached" signal attendance.service.js's
    -- getDaySummary uses for its per-trip current_stop.
    (SELECT st.name FROM attendance_records ar
       JOIN stops st ON st.id = ar.stop_id
       WHERE ar.trip_id = t.id
       ORDER BY ar.created_at DESC LIMIT 1
    ) AS current_stop
  FROM trips t
  JOIN routes r ON r.id = t.route_id
  JOIN drivers d ON d.id = t.driver_id
  JOIN buses b ON b.id = t.bus_id
`;

function toResponse(row) {
  return {
    id: row.id,
    route_id: row.route_id,
    route_name: row.route_name,
    driver_id: row.driver_id,
    driver_name: row.driver_name,
    driver_phone: row.driver_phone || undefined,
    driver_email: row.driver_email || undefined,
    bus_id: row.bus_id,
    bus_number: row.bus_number,
    trip_type: row.trip_type,
    status: row.status,
    started_at: row.started_at || undefined,
    ended_at: row.ended_at || undefined,
    student_count: row.student_count,
    present_count: row.present_count,
    current_stop: row.current_stop || undefined,
  };
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

/** "Today" as seen in a school's own local timezone, falling back to the
 * UTC-based todayDate() when no school context is available. */
async function schoolToday(schoolId) {
  if (!schoolId) return todayDate();
  const { rows } = await query('SELECT timezone FROM schools WHERE id = $1', [schoolId]);
  return todayInTimezone(rows[0]?.timezone || 'Asia/Kolkata');
}

async function list(schoolId, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`r.school_id = $${params.length}`);
  }
  if (filters.route_id) {
    params.push(filters.route_id);
    conditions.push(`t.route_id = $${params.length}`);
  }
  if (filters.bus_id) {
    params.push(filters.bus_id);
    conditions.push(`t.bus_id = $${params.length}`);
  }
  if (filters.driver_id) {
    params.push(filters.driver_id);
    conditions.push(`t.driver_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`t.status = $${params.length}`);
  }
  // "Current trips" is the default view most pages need, so default to today
  // when no explicit date filter is supplied — EXCEPT when the caller is
  // asking for in_progress trips specifically: a trip that started before
  // midnight and is still running is unambiguously "current" regardless of
  // which calendar day its trip_date says it started on, and every live
  // view (dashboard-stats, live-trips:update, Bus Status/Attendance) relies
  // on this list to reflect trips that are ACTUALLY running right now, not
  // just ones that started today.
  if (filters.date || filters.status !== 'in_progress') {
    params.push(filters.date || await schoolToday(schoolId));
    conditions.push(`t.trip_date = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM trips t JOIN routes r ON r.id = t.route_id ${where}`,
    params
  );
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY t.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { trips: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'WHERE t.id = $1 AND r.school_id = $2' : 'WHERE t.id = $1';
  const { rows } = await query(`${BASE_SELECT} ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('Trip not found');
  return toResponse(rows[0]);
}

/** Raw row lookup (includes school_id) used internally for tenant/ownership checks. */
async function getRawById(id) {
  const { rows } = await query(`${BASE_SELECT} WHERE t.id = $1`, [id]);
  if (!rows[0]) throw ApiError.notFound('Trip not found');
  return rows[0];
}

/** Sends a one-way message notification to this trip's driver — the envelope
 * icon on the admin Bus Status/Attendance route cards. Lands in the driver's
 * normal notification inbox (type: 'message'), same table/socket path as
 * every other notification, not a separate chat/thread system. */
async function sendMessageToDriver(id, schoolId, { title, body }) {
  const trip = await getRawById(id);
  if (schoolId && trip.school_id !== schoolId) {
    throw ApiError.notFound('Trip not found');
  }
  const { rows } = await query('SELECT user_id FROM drivers WHERE id = $1', [trip.driver_id]);
  const driverUserId = rows[0]?.user_id;
  if (!driverUserId) throw ApiError.badRequest('This driver has no linked login account to message');

  return createNotification({
    school_id: trip.school_id,
    user_id: driverUserId,
    title: title || `Message about ${trip.route_name}`,
    body,
    type: 'message',
  });
}

async function getBoardingStudents(id, schoolId) {
  const trip = await getRawById(id);
  if (schoolId && trip.school_id !== schoolId) {
    throw ApiError.notFound('Trip not found');
  }

  const { rows } = await query(`
    SELECT s.id, s.name, s.class, s.division, s.student_qr_code,
           COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id) AS pickup_stop_id,
           COALESCE(tso.override_drop_stop_id, s.drop_stop_id) AS drop_stop_id,
           COALESCE(att.status, 'pending') as status,
           att.pickup_time, att.drop_time, att.offboarded_at,
           -- This student's own stop for the trip's direction — same field
           -- attendance.service.js's getDaySummary calls stop_name.
           CASE WHEN $3 = 'pickup' THEN ps.name ELSE ds.name END AS stop_name,
           EXISTS(
             SELECT 1 FROM leaves l
             WHERE l.student_id = s.id
               AND l.status = 'approved'
               AND CURRENT_DATE BETWEEN l.from_date AND l.to_date
               AND (l.shift = 'full_day' OR l.shift = CASE WHEN $3 = 'pickup' THEN 'morning' ELSE 'evening' END)
           ) AS is_leave_applied
    FROM students s
    LEFT JOIN trip_student_overrides tso ON tso.student_id = s.id AND tso.trip_id = $1
    LEFT JOIN attendance_records att ON att.student_id = s.id AND att.trip_id = $1
    LEFT JOIN stops ps ON ps.id = COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id)
    LEFT JOIN stops ds ON ds.id = COALESCE(tso.override_drop_stop_id, s.drop_stop_id)
    WHERE COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id) IN (SELECT id FROM stops WHERE route_id = $2)
       OR COALESCE(tso.override_drop_stop_id, s.drop_stop_id) IN (SELECT id FROM stops WHERE route_id = $2)
  `, [id, trip.route_id, trip.trip_type]);

  return rows;
}

/** Full recorded GPS trail for a trip, oldest first — the traveled-path
 * polyline on the Live Map is drawn straight from this. */
async function getPath(id, schoolId) {
  const trip = await getRawById(id);
  if (schoolId && trip.school_id !== schoolId) {
    throw ApiError.notFound('Trip not found');
  }
  const { rows } = await query(
    `SELECT latitude, longitude, recorded_at FROM bus_locations
     WHERE trip_id = $1 ORDER BY recorded_at ASC`,
    [id]
  );
  return rows.map((r) => ({
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    recorded_at: r.recorded_at,
  }));
}

async function getLocationsForTrip(routeId, tripType, tripId) {
  const order = tripType === 'drop' ? 'DESC' : 'ASC';
  const { rows: stops } = await query(`
    SELECT id AS stop_id, name AS stop_name, latitude, longitude, order_index
    FROM stops
    WHERE route_id = $1
    ORDER BY order_index ${order}
  `, [routeId]);

  // trip_student_overrides is joined on this specific tripId, not "whichever
  // trip on this route happens to be in_progress" — a route can have more
  // than one in-progress trip at once (e.g. pickup and drop overlapping), and
  // joining on status alone duplicated every student once per such trip.
  const { rows: students } = await query(`
    SELECT s.id, s.name, s.class, s.division, s.student_qr_code,
           COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id) AS pickup_stop_id,
           COALESCE(tso.override_drop_stop_id, s.drop_stop_id) AS drop_stop_id,
           EXISTS(
             SELECT 1 FROM leaves l
             WHERE l.student_id = s.id
               AND l.status = 'approved'
               AND CURRENT_DATE BETWEEN l.from_date AND l.to_date
               AND (l.shift = 'full_day' OR l.shift = CASE WHEN $2 = 'pickup' THEN 'morning' ELSE 'evening' END)
           ) AS is_leave_applied
    FROM students s
    LEFT JOIN trip_student_overrides tso ON tso.student_id = s.id AND tso.trip_id = $3
    WHERE COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id) IN (SELECT id FROM stops WHERE route_id = $1)
       OR COALESCE(tso.override_drop_stop_id, s.drop_stop_id) IN (SELECT id FROM stops WHERE route_id = $1)
  `, [routeId, tripType, tripId || null]);

  const locations = stops.map(stop => {
    const stopStudents = students.filter(s => 
      tripType === 'pickup' ? s.pickup_stop_id === stop.stop_id : (s.drop_stop_id || s.pickup_stop_id) === stop.stop_id
    ).map(({ id, name, class: studentClass, division, student_qr_code, is_leave_applied }) => ({
      id, name, class: studentClass, division, student_qr_code, is_leave_applied
    }));

    return { ...stop, students: stopStudents };
  });

  return locations;
}

/** Student ids reachable via this route's stops (pickup or drop) — used to
 * fan out a bus:status broadcast to everyone affected when a trip's status
 * changes, not just the one student whose attendance record just moved. */
async function getStudentIdsForRoute(routeId) {
  const { rows } = await query(
    `SELECT id FROM students
     WHERE pickup_stop_id IN (SELECT id FROM stops WHERE route_id = $1)
        OR drop_stop_id IN (SELECT id FROM stops WHERE route_id = $1)`,
    [routeId]
  );
  return rows.map((r) => r.id);
}

async function isDriverOwnTrip(tripId, userId) {
  const { rows: tripRows } = await query('SELECT driver_id FROM trips WHERE id = $1', [tripId]);
  if (tripRows.length === 0) {
    throw ApiError.notFound('Trip not found. Make sure you are passing a valid active trip_id.');
  }

  const { rows } = await query(
    `SELECT 1 FROM drivers WHERE id = $1 AND user_id = $2`,
    [tripRows[0].driver_id, userId]
  );
  return rows.length > 0;
}

async function create(schoolId, data) {
  if (schoolId) {
    const { rows } = await query('SELECT id FROM routes WHERE id = $1 AND school_id = $2', [data.route_id, schoolId]);
    if (!rows[0]) throw ApiError.badRequest('Invalid route_id for this school');
  }
  const { rows } = await query(
    `INSERT INTO trips (route_id, driver_id, bus_id, trip_type, status, trip_date, started_at, ended_at)
     VALUES ($1,$2,$3,$4,COALESCE($5,'not_started'),COALESCE($6, CURRENT_DATE),$7,$8)
     RETURNING id`,
    [
      data.route_id, data.driver_id, data.bus_id, data.trip_type, data.status || null,
      data.trip_date || null, data.started_at || null, data.ended_at || null,
    ]
  );
  return getById(rows[0].id, schoolId);
}

/**
 * Updates a trip and, when the status transitions into/out of 'in_progress'
 * or 'completed', keeps buses.current_trip_id / buses.status in sync in the
 * same transaction: entering in_progress marks the bus running and points
 * current_trip_id at this trip; entering completed clears current_trip_id
 * (only if it still points at this trip) and marks the bus idle.
 */
async function update(id, schoolId, data) {
  const existing = await getRawById(id);
  if (schoolId && existing.school_id !== schoolId) {
    throw ApiError.notFound('Trip not found');
  }

  await withTransaction(async (client) => {
    const fields = ['route_id', 'driver_id', 'bus_id', 'trip_type', 'status', 'trip_date', 'started_at', 'ended_at'];
    const sets = [];
    const params = [];
    for (const field of fields) {
      if (data[field] !== undefined) {
        params.push(data[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }

    const statusChanged = data.status !== undefined && data.status !== existing.status;
    if (statusChanged && data.status === 'in_progress' && data.started_at === undefined) {
      sets.push('started_at = now()');
    }
    if (statusChanged && data.status === 'completed' && data.ended_at === undefined) {
      sets.push('ended_at = now()');
    }

    if (sets.length) {
      params.push(id);
      await client.query(`UPDATE trips SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    }

    if (statusChanged) {
      const effectiveBusId = data.bus_id !== undefined ? data.bus_id : existing.bus_id;
      if (data.status === 'in_progress') {
        await client.query(
          `UPDATE buses SET current_trip_id = $1, status = 'running', updated_at = now() WHERE id = $2`,
          [id, effectiveBusId]
        );
      } else if (data.status === 'completed') {
        await client.query(
          `UPDATE buses SET current_trip_id = NULL, status = 'idle', updated_at = now()
           WHERE id = $1 AND current_trip_id = $2`,
          [effectiveBusId, id]
        );
      }
    }
  });

  return getById(id, schoolId);
}

async function remove(id, schoolId) {
  const conditions = ['id = $1'];
  const params = [id];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`route_id IN (SELECT id FROM routes WHERE school_id = $${params.length})`);
  }
  const { rowCount } = await query(`DELETE FROM trips WHERE ${conditions.join(' AND ')}`, params);
  if (!rowCount) throw ApiError.notFound('Trip not found');
}

/**
 * Hands an in-progress trip over to a standby driver after a bus breakdown.
 * The admin must have already created a bus_transfers record naming this
 * driver as new_driver_id (busTransfersService.create) — that step already
 * repoints the trip's bus_id; this step is what actually lets the new
 * driver operate the trip (mark attendance, end it), since every driver-only
 * endpoint checks trips.driver_id against the caller.
 *
 * The driver scans the ORIGINAL (breakdown) bus's QR code, not the new
 * bus's — that's the only bus they have physical/visual access to at the
 * point of breakdown, and it's what identifies which pending transfer is
 * theirs to claim.
 */
async function takeOverTrip(schoolId, data, driverUserId) {
  const { rows: driverRows } = await query('SELECT id FROM drivers WHERE user_id = $1 AND school_id = $2', [driverUserId, schoolId]);
  if (!driverRows[0]) throw ApiError.badRequest('Driver profile not found');
  const driverId = driverRows[0].id;

  const { rows: busRows } = await query('SELECT * FROM buses WHERE safety_qr_code = $1 AND school_id = $2', [data.safety_qr_code, schoolId]);
  if (!busRows[0]) throw ApiError.badRequest('Invalid safety QR code. Bus not found for this school.');
  const bus = busRows[0];

  // Only an 'initiated' transfer is unclaimed — claiming it here flips it
  // straight to 'completed' (see below) so a second scan of the same
  // breakdown bus doesn't match the same transfer again.
  const { rows: transferRows } = await query(
    `SELECT * FROM bus_transfers WHERE original_bus_id = $1 AND school_id = $2 AND status = 'initiated'
     ORDER BY transfer_at DESC LIMIT 1`,
    [bus.id, schoolId]
  );
  const transfer = transferRows[0];
  if (!transfer) throw ApiError.badRequest('No pending bus transfer found for this bus');
  if (transfer.new_driver_id !== driverId) {
    throw ApiError.forbidden('You are not the assigned driver for this transfer');
  }

  const trip = await getRawById(transfer.original_trip_id);
  if (trip.status !== 'in_progress') {
    throw ApiError.badRequest('This trip is no longer in progress');
  }

  await query('UPDATE trips SET driver_id = $1 WHERE id = $2', [driverId, transfer.original_trip_id]);
  // The scan IS the completion event from the admin's point of view — the
  // standby driver has physically taken over and is now driving; there's no
  // separate "in_progress" stage to wait on afterward.
  await query(`UPDATE bus_transfers SET status = 'completed' WHERE id = $1`, [transfer.id]);

  return getById(transfer.original_trip_id, schoolId);
}

async function startTrip(schoolId, data, driverUserId) {
  // 1. Verify route belongs to school
  const { rows: routeRows } = await query('SELECT * FROM routes WHERE id = $1 AND school_id = $2', [data.route_id, schoolId]);
  if (!routeRows[0]) throw ApiError.badRequest('Invalid route_id');
  const route = routeRows[0];

  // 2. Find driver ID from the logged-in user
  const { rows: driverRows } = await query(
    `SELECT id, is_active, is_guest, guest_validity_type, guest_expires_at, guest_max_trips, guest_trips_used
     FROM drivers WHERE user_id = $1 AND school_id = $2`,
    [driverUserId, schoolId]
  );
  if (!driverRows[0]) throw ApiError.badRequest('Driver profile not found');
  const driver = driverRows[0];
  const driverId = driver.id;
  // Defense in depth alongside auth.service.js's verifyCredentials — a
  // long-lived JWT issued before expiry shouldn't let a guest keep
  // starting trips past their budget without re-logging in.
  if (!driver.is_active) throw ApiError.forbidden('Your account has been deactivated');
  if (driver.is_guest && isGuestExpired(driver)) {
    throw ApiError.forbidden('Your temporary driver access has expired');
  }

  // 3. Find the bus dynamically using the scanned safety QR code
  const { rows: busRows } = await query('SELECT * FROM buses WHERE safety_qr_code = $1 AND school_id = $2', [data.safety_qr_code, schoolId]);
  if (!busRows[0]) throw ApiError.badRequest('Invalid safety QR code. Bus not found for this school.');
  const bus = busRows[0];

  // 4. Create the trip
  const trip = await create(schoolId, {
    route_id: route.id,
    driver_id: driverId,
    bus_id: bus.id,
    trip_type: data.trip_type,
    status: 'in_progress',
    trip_date: await schoolToday(schoolId),
    started_at: new Date().toISOString()
  });

  if (driver.is_guest && driver.guest_validity_type === 'trips') {
    await query('UPDATE drivers SET guest_trips_used = guest_trips_used + 1 WHERE id = $1', [driverId]);
  }

  // 4. Notify parents
  await notifyRouteParents(schoolId, route.id, 'Trip Started', `The ${data.trip_type} trip for route ${route.name} has started.`);

  const locations = await getLocationsForTrip(route.id, data.trip_type, trip.id);

  return { trip, locations };
}

async function prepareTrip(schoolId, data, driverUserId) {
  // 1. Verify route belongs to school
  const { rows: routeRows } = await query('SELECT * FROM routes WHERE id = $1 AND school_id = $2', [data.route_id, schoolId]);
  if (!routeRows[0]) throw ApiError.badRequest('Invalid route_id');
  const route = routeRows[0];

  // 2. Find driver ID from the logged-in user
  const { rows: driverRows } = await query('SELECT id FROM drivers WHERE user_id = $1 AND school_id = $2', [driverUserId, schoolId]);
  if (!driverRows[0]) throw ApiError.badRequest('Driver profile not found');
  const driverId = driverRows[0].id;

  // 3. Find the bus dynamically using the scanned safety QR code
  const { rows: busRows } = await query('SELECT * FROM buses WHERE safety_qr_code = $1 AND school_id = $2', [data.safety_qr_code, schoolId]);
  if (!busRows[0]) throw ApiError.badRequest('Invalid safety QR code. Bus not found for this school.');
  const bus = busRows[0];

  // 4. Create the trip as not_started
  const trip = await create(schoolId, {
    route_id: route.id,
    driver_id: driverId,
    bus_id: bus.id,
    trip_type: data.trip_type,
    status: 'not_started',
    trip_date: await schoolToday(schoolId),
  });

  // 5. Get students for driver boarding response
  const students = await getBoardingStudents(trip.id, schoolId);

  return { trip, students };
}

async function startPreparedTrip(tripId, schoolId, driverUserId) {
  const trip = await getRawById(tripId);
  if (trip.school_id !== schoolId) throw ApiError.notFound('Trip not found');
  
  if (trip.status !== 'not_started') {
    throw ApiError.badRequest('Trip cannot be started because it is already ' + trip.status);
  }

  // Check driver ownership
  const { rows: driverRows } = await query('SELECT id FROM drivers WHERE user_id = $1 AND school_id = $2', [driverUserId, schoolId]);
  if (!driverRows[0] || driverRows[0].id !== trip.driver_id) {
    throw ApiError.forbidden('You are not authorized to start this trip');
  }

  // Update trip
  const updatedTrip = await update(tripId, schoolId, {
    status: 'in_progress',
    started_at: new Date().toISOString()
  });

  // Notify parents
  await notifyRouteParents(schoolId, trip.route_id, 'Trip Started', `The ${updatedTrip.trip_type} trip for route ${trip.route_name} has started.`);

  const locations = await getLocationsForTrip(trip.route_id, trip.trip_type, trip.id);

  return { trip: updatedTrip, locations };
}

async function endTrip(schoolId, data, driverUserId) {
  // 1. Get trip and verify it belongs to school
  const trip = await getRawById(data.trip_id);
  if (trip.school_id !== schoolId) throw ApiError.notFound('Trip not found');

  // 2. Verify safety QR matches the bus for this trip
  const { rows: busRows } = await query('SELECT * FROM buses WHERE id = $1', [trip.bus_id]);
  if (!busRows[0]) throw ApiError.badRequest('Bus not found');
  const bus = busRows[0];

  if (bus.safety_qr_code !== data.safety_qr_code) {
    throw ApiError.badRequest('Invalid safety QR code for this bus');
  }

  // 3. Update trip
  const updatedTrip = await update(data.trip_id, schoolId, {
    status: 'completed',
    ended_at: new Date().toISOString()
  });

  // 4. Notify parents
  await notifyRouteParents(schoolId, trip.route_id, 'Trip Ended', 'The trip has successfully completed.');

  return { trip: updatedTrip };
}

/** Section-header counts for a boarding-students roster (Present / Absent /
 * Not Boarded) — shared by the REST controller action and the live socket
 * push so both compute it identically. A student on leave is pulled out of
 * all three, matching the rest of the app's leave-aware suppression. */
function attendanceCounts(students) {
  return students.reduce((acc, s) => {
    if (s.is_leave_applied) acc.leave++;
    else if (s.status === 'present') acc.present++;
    else if (s.status === 'absent') acc.absent++;
    else acc.not_boarded++;
    return acc;
  }, { present: 0, absent: 0, not_boarded: 0, leave: 0 });
}

module.exports = { list, getById, getBoardingStudents, sendMessageToDriver, getStudentIdsForRoute, getPath, create, update, remove, isDriverOwnTrip, startTrip, takeOverTrip, prepareTrip, startPreparedTrip, endTrip, attendanceCounts };
