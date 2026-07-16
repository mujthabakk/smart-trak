const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');
const { generateQrCode } = require('../../utils/qrcode');

// Route.student_count counts students whose pickup OR drop stop belongs to
// the route (via its stops), matching src/types/index.ts::Route.
const BASE_SELECT = `
  SELECT r.*, b.bus_number, d.name AS driver_name,
    (SELECT COUNT(*)::int FROM students st
       WHERE st.pickup_stop_id IN (SELECT id FROM stops WHERE route_id = r.id)
          OR st.drop_stop_id IN (SELECT id FROM stops WHERE route_id = r.id)
    ) AS student_count
  FROM routes r
  LEFT JOIN buses b ON b.id = r.bus_id
  LEFT JOIN drivers d ON d.id = r.driver_id
`;

function toStopResponse(row) {
  return {
    id: row.id,
    route_id: row.route_id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    order_index: row.order_index,
    estimated_time: row.estimated_time || undefined,
    student_count: row.student_count,
  };
}

function toResponse(row, stops = []) {
  return {
    id: row.id,
    school_id: row.school_id,
    bus_id: row.bus_id || undefined,
    bus_number: row.bus_number || undefined,
    name: row.name,
    type: row.type,
    start_point: row.start_point,
    end_point: row.end_point,
    route_qr_code: row.route_qr_code || undefined,
    stops,
    is_active: row.is_active,
    student_count: row.student_count,
    driver_id: row.driver_id || undefined,
    driver_name: row.driver_name || undefined,
    created_at: row.created_at,
  };
}

/** Fetches stops (with per-stop student_count) for a batch of route ids and groups them. */
async function fetchStopsByRouteIds(routeIds) {
  if (!routeIds.length) return {};
  const { rows } = await query(
    `SELECT s.*,
       (SELECT COUNT(*)::int FROM students st WHERE st.pickup_stop_id = s.id OR st.drop_stop_id = s.id) AS student_count
     FROM stops s
     WHERE s.route_id = ANY($1::text[])
     ORDER BY s.order_index ASC, s.created_at ASC`,
    [routeIds]
  );
  const byRoute = {};
  for (const row of rows) {
    (byRoute[row.route_id] = byRoute[row.route_id] || []).push(toStopResponse(row));
  }
  return byRoute;
}

async function attachStops(rows) {
  const byRoute = await fetchStopsByRouteIds(rows.map((r) => r.id));
  return rows.map((row) => toResponse(row, byRoute[row.id] || []));
}

async function list(schoolId, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`r.school_id = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`r.name ILIKE $${params.length}`);
  }
  if (filters.type) {
    params.push(filters.type);
    conditions.push(`r.type = $${params.length}`);
  }
  if (filters.bus_id) {
    params.push(filters.bus_id);
    conditions.push(`r.bus_id = $${params.length}`);
  }
  if (filters.is_active !== undefined) {
    params.push(filters.is_active === 'true');
    conditions.push(`r.is_active = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM routes r ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY r.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { routes: await attachStops(rows), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'WHERE r.id = $1 AND r.school_id = $2' : 'WHERE r.id = $1';
  const { rows } = await query(`${BASE_SELECT} ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('Route not found');
  const [route] = await attachStops(rows);
  return route;
}

/**
 * Upserts a route's stops inside a transaction: existing rows (matched by id)
 * are updated in place, payload stops without a matching existing id are
 * inserted, and existing rows no longer present are deleted. Updating in
 * place (rather than delete-then-reinsert) preserves stop ids so
 * students.pickup_stop_id / drop_stop_id references are not orphaned when a
 * route's stop list is reordered or edited. Stops that are genuinely removed
 * still delete cleanly because students.pickup_stop_id / drop_stop_id use
 * ON DELETE SET NULL.
 */
async function upsertStops(client, routeId, stops) {
  const { rows: existing } = await client.query('SELECT id FROM stops WHERE route_id = $1', [routeId]);
  const existingIds = new Set(existing.map((row) => row.id));
  const keepIds = new Set();

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    const orderIndex = stop.order_index !== undefined ? stop.order_index : i;
    if (stop.id && existingIds.has(stop.id)) {
      await client.query(
        `UPDATE stops SET name = $1, latitude = $2, longitude = $3, order_index = $4, estimated_time = $5
         WHERE id = $6`,
        [stop.name, stop.latitude, stop.longitude, orderIndex, stop.estimated_time || null, stop.id]
      );
      keepIds.add(stop.id);
    } else {
      const { rows } = await client.query(
        `INSERT INTO stops (route_id, name, latitude, longitude, order_index, estimated_time)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id`,
        [routeId, stop.name, stop.latitude, stop.longitude, orderIndex, stop.estimated_time || null]
      );
      keepIds.add(rows[0].id);
    }
  }

  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
  if (toDelete.length) {
    await client.query('DELETE FROM stops WHERE id = ANY($1::text[])', [toDelete]);
  }
}

async function create(schoolId, data) {
  const routeId = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO routes (school_id, bus_id, driver_id, name, type, start_point, end_point, route_qr_code, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9, true))
       RETURNING id`,
      [
        schoolId, data.bus_id || null, data.driver_id || null, data.name, data.type,
        data.start_point, data.end_point, generateQrCode('RT'), data.is_active,
      ]
    );
    const id = rows[0].id;
    await upsertStops(client, id, data.stops || []);
    return id;
  });
  return getById(routeId, schoolId);
}

async function update(id, schoolId, data) {
  await getById(id, schoolId);
  await withTransaction(async (client) => {
    const fields = ['bus_id', 'driver_id', 'name', 'type', 'start_point', 'end_point', 'is_active'];
    const sets = [];
    const params = [];
    for (const field of fields) {
      if (data[field] !== undefined) {
        params.push(data[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }
    if (sets.length) {
      sets.push('updated_at = now()');
      params.push(id);
      await client.query(`UPDATE routes SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    }
    if (data.stops !== undefined) {
      await upsertStops(client, id, data.stops);
    }
  });
  return getById(id, schoolId);
}

async function remove(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
  const { rowCount } = await query(`DELETE FROM routes WHERE ${where}`, params);
  if (!rowCount) throw ApiError.notFound('Route not found');
}

module.exports = { list, getById, create, update, remove };
