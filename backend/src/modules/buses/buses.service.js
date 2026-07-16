const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');
const { generateQrCode } = require('../../utils/qrcode');

const BASE_SELECT = `
  SELECT b.*, d.name AS driver_name
  FROM buses b
  LEFT JOIN drivers d ON d.id = b.driver_id
`;

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
    driver_id: row.driver_id || undefined,
    driver_name: row.driver_name || undefined,
    status: row.status,
    current_stop: row.current_stop || undefined,
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
           insurance_expiry, fitness_cert_expiry, safety_qr_code, driver_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id`,
        [
          schoolId, bus.bus_number, bus.seat_capacity, bus.make_model || null, bus.year || null,
          bus.insurance_expiry || null, bus.fitness_cert_expiry || null,
          generateQrCode('BUS'), bus.driver_id || null,
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
    'driver_id', 'is_active', 'status', 'current_stop',
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

async function getLatestLocation(id, schoolId) {
  await getById(id, schoolId);
  const { rows } = await query(
    `SELECT bl.*, b.bus_number, d.name AS driver_name
     FROM bus_locations bl
     JOIN buses b ON b.id = bl.bus_id
     LEFT JOIN drivers d ON d.id = b.driver_id
     WHERE bl.bus_id = $1
     ORDER BY bl.recorded_at DESC LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    trip_id: row.trip_id,
    bus_id: row.bus_id,
    bus_number: row.bus_number,
    driver_name: row.driver_name || undefined,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    speed: Number(row.speed),
    current_stop: row.current_stop || undefined,
    status: row.status,
    recorded_at: row.recorded_at,
  };
}

module.exports = { list, getById, createMany, update, remove, getLatestLocation };
