const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');

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

async function isDriverOwnTrip(tripId, userId) {
  const { rows } = await query(
    `SELECT 1 FROM trips t JOIN drivers d ON d.id = t.driver_id WHERE t.id = $1 AND d.user_id = $2`,
    [tripId, userId]
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

module.exports = { list, getById, create, update, remove, isDriverOwnTrip };
