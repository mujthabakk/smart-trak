const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');

const BASE_SELECT = `
  SELECT bt.*,
    ob.bus_number AS original_bus_number,
    nb.bus_number AS new_bus_number,
    nd.name AS new_driver_name,
    ru.name AS requested_by_name
  FROM bus_transfers bt
  JOIN buses ob ON ob.id = bt.original_bus_id
  LEFT JOIN buses nb ON nb.id = bt.new_bus_id
  LEFT JOIN drivers nd ON nd.id = bt.new_driver_id
  LEFT JOIN users ru ON ru.id = bt.requested_by
`;

function toResponse(row) {
  return {
    id: row.id,
    school_id: row.school_id,
    original_trip_id: row.original_trip_id,
    original_bus_id: row.original_bus_id,
    original_bus_number: row.original_bus_number,
    new_bus_id: row.new_bus_id || undefined,
    new_bus_number: row.new_bus_number || undefined,
    new_driver_id: row.new_driver_id || undefined,
    new_driver_name: row.new_driver_name || undefined,
    requested_by: row.requested_by || undefined,
    requested_by_name: row.requested_by_name || undefined,
    authorised_by: row.authorised_by || undefined,
    transfer_at: row.transfer_at,
    status: row.status,
    reason: row.reason,
    affected_students: row.affected_students,
  };
}

async function list(schoolId, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`bt.school_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`bt.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM bus_transfers bt ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY bt.transfer_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { transfers: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'WHERE bt.id = $1 AND bt.school_id = $2' : 'WHERE bt.id = $1';
  const { rows } = await query(`${BASE_SELECT} ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('Bus transfer not found');
  return toResponse(rows[0]);
}

/**
 * Creates a transfer and, in the same transaction, moves the trip onto the new bus:
 * the trip's bus_id is repointed, the old bus is freed up (current_trip_id cleared,
 * status -> idle) and the new bus takes over (current_trip_id set, status -> running).
 * This mirrors the current_trip_id/status bookkeeping the rest of the codebase keeps
 * on `buses` whenever a bus starts/stops actively running a trip.
 */
async function create(schoolId, authorisedBy, data) {
  const id = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO bus_transfers
         (school_id, original_trip_id, original_bus_id, new_bus_id, new_driver_id,
          authorised_by, reason, affected_students)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,0))
       RETURNING id`,
      [
        schoolId,
        data.original_trip_id,
        data.original_bus_id,
        data.new_bus_id,
        data.new_driver_id || null,
        authorisedBy,
        data.reason,
        data.affected_students,
      ]
    );
    const transferId = rows[0].id;

    // The trip in progress continues on the new bus.
    await client.query(`UPDATE trips SET bus_id = $1 WHERE id = $2`, [data.new_bus_id, data.original_trip_id]);

    // Old bus is no longer actively running this trip.
    await client.query(
      `UPDATE buses SET current_trip_id = NULL, status = 'idle', updated_at = now() WHERE id = $1`,
      [data.original_bus_id]
    );

    // New bus picks up the trip and goes active.
    await client.query(
      `UPDATE buses SET current_trip_id = $1, status = 'running', updated_at = now() WHERE id = $2`,
      [data.original_trip_id, data.new_bus_id]
    );

    return transferId;
  });
  return getById(id, schoolId);
}

/**
 * A driver reports a problem (breakdown etc.) on their own current trip and
 * asks for a replacement bus, without knowing/choosing one themselves — that
 * choice is the admin's. Resolves the driver's own in-progress trip/bus from
 * their token rather than trusting client-supplied ids (same pattern as
 * trips.service.js's startTrip/takeOverTrip).
 */
async function requestTransfer(schoolId, driverUserId, reason) {
  const { rows: driverRows } = await query('SELECT id FROM drivers WHERE user_id = $1 AND school_id = $2', [driverUserId, schoolId]);
  if (!driverRows[0]) throw ApiError.badRequest('Driver profile not found');
  const driverId = driverRows[0].id;

  const { rows: tripRows } = await query(
    `SELECT * FROM trips WHERE driver_id = $1 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1`,
    [driverId]
  );
  const trip = tripRows[0];
  if (!trip) throw ApiError.badRequest('You have no in-progress trip to request a transfer for');

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM students st
       WHERE st.pickup_stop_id IN (SELECT id FROM stops WHERE route_id = $1)
          OR st.drop_stop_id IN (SELECT id FROM stops WHERE route_id = $1)`,
    [trip.route_id]
  );

  const { rows } = await query(
    `INSERT INTO bus_transfers
       (school_id, original_trip_id, original_bus_id, requested_by, reason, affected_students, status)
     VALUES ($1,$2,$3,$4,$5,$6,'requested')
     RETURNING id`,
    [schoolId, trip.id, trip.bus_id, driverUserId, reason, countRows[0].total]
  );
  return getById(rows[0].id, schoolId);
}

/**
 * Admin fulfils a 'requested' transfer by picking the replacement bus (and
 * optionally a new driver) — from here it's the exact same bus-swap
 * bookkeeping as create() does up front for an admin-initiated transfer.
 */
async function assignBus(id, schoolId, actingUserId, data) {
  const existing = await getById(id, schoolId);
  if (existing.status !== 'requested') {
    throw ApiError.badRequest('This transfer has already been assigned');
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE bus_transfers SET new_bus_id = $1, new_driver_id = $2, authorised_by = $3, status = 'initiated'
       WHERE id = $4`,
      [data.new_bus_id, data.new_driver_id || null, actingUserId, id]
    );
    await client.query(`UPDATE trips SET bus_id = $1 WHERE id = $2`, [data.new_bus_id, existing.original_trip_id]);
    await client.query(
      `UPDATE buses SET current_trip_id = NULL, status = 'idle', updated_at = now() WHERE id = $1`,
      [existing.original_bus_id]
    );
    await client.query(
      `UPDATE buses SET current_trip_id = $1, status = 'running', updated_at = now() WHERE id = $2`,
      [existing.original_trip_id, data.new_bus_id]
    );
  });

  return getById(id, schoolId);
}

async function update(id, schoolId, data) {
  const existing = await getById(id, schoolId);
  if (existing.status === 'requested' && data.status !== undefined) {
    throw ApiError.badRequest('A requested transfer has no bus assigned yet — use the assign-bus action instead');
  }
  const fields = ['status', 'reason', 'affected_students', 'new_driver_id'];
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
  await query(`UPDATE bus_transfers SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return getById(id, schoolId);
}

module.exports = { list, getById, create, requestTransfer, assignBus, update };
