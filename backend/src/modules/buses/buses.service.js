const { query, withTransaction, masterPool } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');
const { generateQrCode } = require('../../utils/qrcode');
const { haversineKm } = require('../../utils/geo');

const BASE_SELECT = `SELECT b.* FROM buses b`;

function toResponse(row) {
  return {
    id: row.id,
    school_id: row.school_id,
    bus_number: row.bus_number,
    seat_capacity: row.seat_capacity,
    make_model: row.make_model || undefined,
    year: row.year || undefined,
    insurance_expiry: row.insurance_expiry || undefined,
    fitness_cert_expiry: row.fitness_cert_expiry || undefined,
    safety_qr_code: row.safety_qr_code || undefined,
    is_active: row.is_active,
    current_trip_id: row.current_trip_id || undefined,
    status: row.status,
    current_stop: row.current_stop || undefined,
    assistant_name: row.assistant_name || undefined,
    assistant_phone: row.assistant_phone || undefined,
    created_at: row.created_at,
  };
}

async function list(schoolId, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`b.school_id = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`b.bus_number ILIKE $${params.length}`);
  }
  if (filters.is_active !== undefined) {
    params.push(filters.is_active === 'true');
    conditions.push(`b.is_active = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM buses b ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY b.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { buses: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'WHERE b.id = $1 AND b.school_id = $2' : 'WHERE b.id = $1';
  const { rows } = await query(`${BASE_SELECT} ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('Bus not found');
  return toResponse(rows[0]);
}

/** Bulk-creates buses in a single transaction (AddBus.tsx submits multiple rows at once). */
async function createMany(schoolId, busInputs) {
  return withTransaction(async (client) => {
    const created = [];
    for (const bus of busInputs) {
      const { rows } = await client.query(
        `INSERT INTO buses (school_id, bus_number, seat_capacity, make_model, year,
           insurance_expiry, fitness_cert_expiry, safety_qr_code, assistant_name, assistant_phone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [
          schoolId, bus.bus_number, bus.seat_capacity, bus.make_model || null, bus.year || null,
          bus.insurance_expiry || null, bus.fitness_cert_expiry || null,
          generateQrCode('BUS'),
          bus.assistant_name || null, bus.assistant_phone || null,
        ]
      );
      created.push(rows[0].id);
    }
    return created;
  }).then((ids) => Promise.all(ids.map((id) => getById(id, schoolId))));
}

async function update(id, schoolId, data) {
  await getById(id, schoolId);
  const fields = [
    'bus_number', 'seat_capacity', 'make_model', 'year', 'insurance_expiry', 'fitness_cert_expiry',
    'is_active', 'status', 'current_stop', 'assistant_name', 'assistant_phone',
  ];
  const sets = [];
  const params = [];
  for (const field of fields) {
    if (data[field] !== undefined) {
      params.push(data[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getById(id, schoolId);
  sets.push('updated_at = now()');
  params.push(id);
  await query(`UPDATE buses SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return getById(id, schoolId);
}

async function remove(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
  const { rowCount } = await query(`DELETE FROM buses WHERE ${where}`, params);
  if (!rowCount) throw ApiError.notFound('Bus not found');
}

/** ETA to the trip's final destination: for a pickup trip that's the school
 * itself — its own verified coordinates (schoolLatitude/schoolLongitude,
 * from the master schools row) are used when set, rather than inferring
 * "wherever the route's highest order_index stop happens to be", which
 * silently breaks if a route's stops were seeded/edited inconsistently
 * with the school's actual address. Falls back to that stop-based guess
 * only when the school has no location set. A drop trip's destination is
 * never the school, so it always uses the lowest order_index stop (the
 * last student's stop). Null when idle/no speed — can't estimate arrival
 * time while stationary. */
async function getEtaMinutes({ routeId, tripType, latitude, longitude, speedKmh, schoolLatitude, schoolLongitude }) {
  if (speedKmh < 1) return null;

  if (tripType === 'pickup' && schoolLatitude != null && schoolLongitude != null) {
    const distanceKm = haversineKm(latitude, longitude, schoolLatitude, schoolLongitude);
    return Math.round((distanceKm / speedKmh) * 60);
  }

  if (!routeId) return null;
  const { rows } = await query(
    `SELECT latitude, longitude FROM stops WHERE route_id = $1
     ORDER BY order_index ${tripType === 'drop' ? 'ASC' : 'DESC'} LIMIT 1`,
    [routeId]
  );
  const finalStop = rows[0];
  if (!finalStop) return null;
  const distanceKm = haversineKm(latitude, longitude, Number(finalStop.latitude), Number(finalStop.longitude));
  return Math.round((distanceKm / speedKmh) * 60);
}

const LOCATION_META_SELECT = `
  b.bus_number, b.school_id, d.name AS driver_name, d.phone AS driver_phone,
  t.started_at AS trip_started_at, t.ended_at AS trip_ended_at, t.status AS trip_status,
  t.route_id AS trip_route_id, t.trip_type AS trip_type, r.name AS route_name,
  (SELECT COUNT(*)::int FROM attendance_records ar
     WHERE ar.trip_id = t.id AND ar.status = 'present'
       AND ar.pickup_time IS NOT NULL AND ar.drop_time IS NULL
  ) AS onboard_count,
  (SELECT COUNT(*)::int FROM students st
     WHERE st.pickup_stop_id IN (SELECT id FROM stops WHERE route_id = t.route_id)
        OR st.drop_stop_id IN (SELECT id FROM stops WHERE route_id = t.route_id)
  ) AS student_count
`;

/** Whether one of this parent's own children actually rides the given
 * trip's route (matched the same pickup/drop-stop way trips.service.js's
 * parentTripCondition does) — a parent may only see live location data for
 * a trip their child is on. */
async function tripIncludesParentChild(tripId, parentUserId) {
  const { rows } = await query(
    `SELECT 1
     FROM students s
     JOIN parent_details pd ON pd.student_id = s.id
     JOIN users u ON lower(u.email) = lower(pd.email)
     LEFT JOIN trip_student_overrides tso ON tso.student_id = s.id AND tso.trip_id = $1
     WHERE u.id = $2
       AND (
         COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id) IN (SELECT id FROM stops WHERE route_id = (SELECT route_id FROM trips WHERE id = $1))
         OR COALESCE(tso.override_drop_stop_id, s.drop_stop_id) IN (SELECT id FROM stops WHERE route_id = (SELECT route_id FROM trips WHERE id = $1))
       )
     LIMIT 1`,
    [tripId, parentUserId]
  );
  return rows.length > 0;
}

async function getLatestLocation(id, schoolId, parentUserId) {
  const bus = await getById(id, schoolId);
  let row;

  if (bus.current_trip_id) {
    // A trip that has just started but hasn't sent its first GPS ping yet
    // has no bus_locations row of its own — naively taking "whichever row
    // is most recent for this bus" would then surface the *previous*
    // (already-ended) trip's start time/route/driver as if they belonged
    // to the new one. So pin the trip metadata to the bus's actual active
    // trip, and only borrow a position from the last GPS ping of any trip
    // (if this one hasn't pinged yet) to keep the map marker in place.
    const { rows } = await query(
      `SELECT t.id AS trip_id, $1::text AS bus_id, ${LOCATION_META_SELECT},
         pos.latitude, pos.longitude, pos.speed, pos.current_stop, pos.recorded_at
       FROM trips t
       JOIN buses b ON b.id = $1
       LEFT JOIN drivers d ON d.id = t.driver_id
       LEFT JOIN routes r ON r.id = t.route_id
       LEFT JOIN LATERAL (
         SELECT latitude, longitude, speed, current_stop, recorded_at
         FROM bus_locations WHERE bus_id = $1 AND trip_id = t.id
         ORDER BY recorded_at DESC LIMIT 1
       ) pos ON true
       WHERE t.id = $2`,
      [id, bus.current_trip_id]
    );
    row = rows[0];
    if (row && row.latitude == null) {
      const { rows: lastKnown } = await query(
        `SELECT latitude, longitude, speed, current_stop, recorded_at
         FROM bus_locations WHERE bus_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
        [id]
      );
      if (lastKnown[0]) Object.assign(row, lastKnown[0]);
    }
  } else {
    // No active trip — last-known parked position (any past trip) is the
    // best we can show, same as before.
    const { rows } = await query(
      `SELECT bl.trip_id, bl.bus_id, bl.latitude, bl.longitude, bl.speed, bl.current_stop, bl.recorded_at,
         ${LOCATION_META_SELECT}
       FROM bus_locations bl
       JOIN buses b ON b.id = bl.bus_id
       LEFT JOIN trips t ON t.id = bl.trip_id
       LEFT JOIN drivers d ON d.id = t.driver_id
       LEFT JOIN routes r ON r.id = t.route_id
       WHERE bl.bus_id = $1
       ORDER BY bl.recorded_at DESC LIMIT 1`,
      [id]
    );
    row = rows[0];
  }

  if (!row || row.latitude == null) return null;

  // A parent only ever sees live location data for a trip one of their own
  // children actually rides — never any bus in the school.
  if (parentUserId && !(await tripIncludesParentChild(row.trip_id, parentUserId))) {
    return null;
  }

  // schools live in the master DB, not this tenant DB, so this can't be a
  // plain SQL JOIN — it's a second query against a different database.
  // Fetched before the ETA calc below, which prefers the school's own
  // coordinates as a pickup trip's destination over guessing from stops.
  const { rows: schoolRows } = await masterPool.query(
    'SELECT latitude, longitude FROM schools WHERE id = $1',
    [row.school_id]
  );
  const school = schoolRows[0];

  // The trip's own live status, not bl.status — bl.status is a snapshot
  // frozen at the moment of that GPS ping, so a bus whose trip has since
  // ended would otherwise keep reporting "in_progress" forever (while
  // ended_at is simultaneously set) until a newer ping happens to arrive.
  const liveStatus = row.trip_status || row.status;
  const etaMinutes = liveStatus === 'in_progress'
    ? await getEtaMinutes({
        routeId: row.trip_route_id,
        tripType: row.trip_type,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        speedKmh: Number(row.speed),
        schoolLatitude: school?.latitude != null ? Number(school.latitude) : undefined,
        schoolLongitude: school?.longitude != null ? Number(school.longitude) : undefined,
      })
    : null;

  return {
    trip_id: row.trip_id,
    bus_id: row.bus_id,
    bus_number: row.bus_number,
    driver_name: row.driver_name || undefined,
    driver_phone: row.driver_phone || undefined,
    route_name: row.route_name || undefined,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    speed: Number(row.speed),
    current_stop: row.current_stop || undefined,
    status: liveStatus,
    recorded_at: row.recorded_at,
    onboard_count: row.onboard_count,
    student_count: row.student_count,
    started_at: row.trip_started_at || undefined,
    ended_at: row.trip_ended_at || undefined,
    eta_minutes: etaMinutes,
    school_latitude: school?.latitude != null ? Number(school.latitude) : undefined,
    school_longitude: school?.longitude != null ? Number(school.longitude) : undefined,
  };
}

module.exports = { list, getById, createMany, update, remove, getLatestLocation };
