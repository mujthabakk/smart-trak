const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');
const { sendPushNotification } = require('../../services/notifications');

// Trips have no direct school_id column — tenant scoping is derived through
// the route they belong to (routes.school_id), hence the join to routes here.
// student_count reuses the same "students whose pickup/drop stop belongs to
// the route's stops" logic as the routes module, joined through the trip's route_id.
const BASE_SELECT = `
  SELECT t.*, r.name AS route_name, r.school_id AS school_id, d.name AS driver_name, b.bus_number,
    (SELECT COUNT(*)::int FROM students st
       WHERE st.pickup_stop_id IN (SELECT id FROM stops WHERE route_id = t.route_id)
          OR st.drop_stop_id IN (SELECT id FROM stops WHERE route_id = t.route_id)
    ) AS student_count
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
    bus_id: row.bus_id,
    bus_number: row.bus_number,
    trip_type: row.trip_type,
    status: row.status,
    started_at: row.started_at || undefined,
    ended_at: row.ended_at || undefined,
    student_count: row.student_count,
  };
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
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
  // when no explicit date filter is supplied.
  params.push(filters.date || todayDate());
  conditions.push(`t.trip_date = $${params.length}`);

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
           EXISTS(
             SELECT 1 FROM leaves l 
             WHERE l.student_id = s.id 
               AND l.status = 'approved' 
               AND CURRENT_DATE BETWEEN l.from_date AND l.to_date
           ) AS is_leave_applied
    FROM students s
    LEFT JOIN trip_student_overrides tso ON tso.student_id = s.id AND tso.trip_id = $1
    LEFT JOIN attendance_records att ON att.student_id = s.id AND att.trip_id = $1
    WHERE COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id) IN (SELECT id FROM stops WHERE route_id = $2)
       OR COALESCE(tso.override_drop_stop_id, s.drop_stop_id) IN (SELECT id FROM stops WHERE route_id = $2)
  `, [id, trip.route_id]);

  return rows;
}

async function getLocationsForTrip(routeId, tripType) {
  const order = tripType === 'drop' ? 'DESC' : 'ASC';
  const { rows: stops } = await query(`
    SELECT id AS stop_id, name AS stop_name, latitude, longitude, order_index
    FROM stops
    WHERE route_id = $1
    ORDER BY order_index ${order}
  `, [routeId]);

  const { rows: students } = await query(`
    SELECT s.id, s.name, s.class, s.division, s.student_qr_code, 
           COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id) AS pickup_stop_id, 
           COALESCE(tso.override_drop_stop_id, s.drop_stop_id) AS drop_stop_id,
           EXISTS(
             SELECT 1 FROM leaves l 
             WHERE l.student_id = s.id 
               AND l.status = 'approved' 
               AND CURRENT_DATE BETWEEN l.from_date AND l.to_date
           ) AS is_leave_applied
    FROM students s
    LEFT JOIN trips t ON t.status = 'in_progress' AND t.route_id = $1
    LEFT JOIN trip_student_overrides tso ON tso.student_id = s.id AND tso.trip_id = t.id
    WHERE COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id) IN (SELECT id FROM stops WHERE route_id = $1)
       OR COALESCE(tso.override_drop_stop_id, s.drop_stop_id) IN (SELECT id FROM stops WHERE route_id = $1)
  `, [routeId]);

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

async function startTrip(schoolId, data, driverUserId) {
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

  // 4. Create the trip
  const trip = await create(schoolId, {
    route_id: route.id,
    driver_id: driverId,
    bus_id: bus.id,
    trip_type: data.trip_type,
    status: 'in_progress',
    started_at: new Date().toISOString()
  });

  // 4. Notify parents
  const { rows: parentRows } = await query(`
    SELECT DISTINCT u.id AS user_id, u.fcm_token
    FROM students s
    JOIN parent_details p ON p.student_id = s.id
    JOIN users u ON u.email = p.email
    WHERE s.pickup_stop_id IN (SELECT id FROM stops WHERE route_id = $1)
       OR s.drop_stop_id IN (SELECT id FROM stops WHERE route_id = $1)
  `, [route.id]);

  const userIds = parentRows.map(p => p.user_id);
  if (userIds.length > 0) {
    await sendPushNotification(userIds, 'Trip Started', `The ${data.trip_type} trip for route ${route.name} has started.`, { tripId: trip.id });
  }

  const locations = await getLocationsForTrip(route.id, data.trip_type);

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
    trip_date: new Date().toISOString() // Just track the date it was prepared
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
  const { rows: parentRows } = await query(`
    SELECT DISTINCT u.id AS user_id, u.fcm_token
    FROM students s
    JOIN parent_details p ON p.student_id = s.id
    JOIN users u ON u.email = p.email
    WHERE s.pickup_stop_id IN (SELECT id FROM stops WHERE route_id = $1)
       OR s.drop_stop_id IN (SELECT id FROM stops WHERE route_id = $1)
  `, [trip.route_id]);

  const userIds = parentRows.map(p => p.user_id);
  if (userIds.length > 0) {
    await sendPushNotification(userIds, 'Trip Started', `The ${updatedTrip.trip_type} trip for route ${trip.route_name} has started.`, { tripId: trip.id });
  }

  const locations = await getLocationsForTrip(trip.route_id, trip.trip_type);

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
  const { rows: parentRows } = await query(`
    SELECT DISTINCT u.id AS user_id, u.fcm_token
    FROM students s
    JOIN parent_details p ON p.student_id = s.id
    JOIN users u ON u.email = p.email
    WHERE s.pickup_stop_id IN (SELECT id FROM stops WHERE route_id = $1)
       OR s.drop_stop_id IN (SELECT id FROM stops WHERE route_id = $1)
  `, [trip.route_id]);

  const userIds = parentRows.map(p => p.user_id);
  if (userIds.length > 0) {
    await sendPushNotification(userIds, 'Trip Ended', `The trip has successfully completed.`, { tripId: trip.id });
  }

  return { trip: updatedTrip };
}

module.exports = { list, getById, getBoardingStudents, create, update, remove, isDriverOwnTrip, startTrip, prepareTrip, startPreparedTrip, endTrip };
