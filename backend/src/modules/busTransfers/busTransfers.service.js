const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');

const BASE_SELECT = `
  SELECT bt.*,
    ob.bus_number AS original_bus_number,
    nb.bus_number AS new_bus_number,
    nd.name AS new_driver_name
  FROM bus_transfers bt
  JOIN buses ob ON ob.id = bt.original_bus_id
  JOIN buses nb ON nb.id = bt.new_bus_id
  LEFT JOIN drivers nd ON nd.id = bt.new_driver_id
`;

function toResponse(row) {
  return {
    id: row.id,
    school_id: row.school_id,
    original_trip_id: row.original_trip_id,
    original_bus_id: row.original_bus_id,
    original_bus_number: row.original_bus_number,
    new_bus_id: row.new_bus_id,
    new_bus_number: row.new_bus_number,
    new_driver_id: row.new_driver_id || undefined,
    new_driver_name: row.new_driver_name || undefined,
    authorised_by: row.authorised_by,
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

async function update(id, schoolId, data) {
  await getById(id, schoolId);
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

module.exports = { list, getById, create, update };
