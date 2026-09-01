const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');
const { generateQrCode } = require('../../utils/qrcode');

// route_name is derived by following pickup_stop_id -> stops.route_id -> routes.name,
// falling back to the drop stop's route when there's no pickup stop set.
const BASE_SELECT = `
  SELECT 
    s.id, s.school_id, s.name, s.class, s.division, s.roll_number, s.dob, s.gender, s.photo_url, s.student_qr_code, s.is_active, s.address, s.created_at, s.updated_at,
    COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id) AS pickup_stop_id,
    COALESCE(tso.override_drop_stop_id, s.drop_stop_id) AS drop_stop_id,
    (tso.id IS NOT NULL) AS is_temporary_override,
    COALESCE(pr.name, dr.name) AS route_name,
    COALESCE(pr.id, dr.id) AS route_id,
    s.alert_pickup_stop_id, s.alert_drop_stop_id
  FROM students s
  LEFT JOIN trips t ON t.status = 'in_progress' AND (
      t.route_id = (SELECT route_id FROM stops WHERE id = s.pickup_stop_id LIMIT 1) OR
      t.route_id = (SELECT route_id FROM stops WHERE id = s.drop_stop_id LIMIT 1)
  )
  LEFT JOIN trip_student_overrides tso ON tso.student_id = s.id AND tso.trip_id = t.id
  LEFT JOIN stops ps ON ps.id = COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id)
  LEFT JOIN routes pr ON pr.id = ps.route_id
  LEFT JOIN stops ds ON ds.id = COALESCE(tso.override_drop_stop_id, s.drop_stop_id)
  LEFT JOIN routes dr ON dr.id = ds.route_id
`;

function toParentResponse(row) {
  return {
    id: row.id,
    student_id: row.student_id,
    parent_name: row.parent_name,
    relationship: row.relationship,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
  };
}

function toResponse(row, parents = []) {
  return {
    id: row.id,
    school_id: row.school_id,
    name: row.name,
    class: row.class,
    division: row.division,
    roll_number: row.roll_number,
    dob: row.dob,
    photo_url: row.photo_url || undefined,
    student_qr_code: row.student_qr_code || undefined,
    is_active: row.is_active,
    pickup_stop_id: row.pickup_stop_id || undefined,
    drop_stop_id: row.drop_stop_id || undefined,
    route_id: row.route_id || undefined,
    route_name: row.route_name || undefined,
    alert_pickup_stop_id: row.alert_pickup_stop_id || undefined,
    alert_drop_stop_id: row.alert_drop_stop_id || undefined,
    parents: parents.map(toParentResponse),
    created_at: row.created_at,
  };
}

/** Batches the parent_details lookup for a page of students (avoids duplicating student
 *  rows via a JOIN, and avoids N+1 queries). */
async function getParentsByStudentId(studentIds) {
  if (!studentIds.length) return {};
  const { rows } = await query(
    `SELECT * FROM parent_details WHERE student_id = ANY($1::text[]) ORDER BY created_at ASC`,
    [studentIds]
  );
  const map = {};
  for (const row of rows) {
    if (!map[row.student_id]) map[row.student_id] = [];
    map[row.student_id].push(row);
  }
  return map;
}

/** A student "belongs" to a parent when the parent's login email matches an
 * email on file in parent_details for that student — parent accounts are
 * provisioned with the same email already recorded as a parent contact. */
function parentChildCondition(paramIndex) {
  return `EXISTS (
    SELECT 1 FROM parent_details pd
    JOIN users u ON lower(u.email) = lower(pd.email)
    WHERE pd.student_id = s.id AND u.id = $${paramIndex}
  )`;
}

function resolveName(data) {
  return data.name !== undefined ? data.name : data.fullName;
}
function resolveClass(data) {
  return data.class !== undefined ? data.class : data.className;
}
function resolveParentName(p) {
  return p.parent_name !== undefined ? p.parent_name : p.guardianName;
}

async function insertParents(client, studentId, parents) {
  for (const p of parents) {
    await client.query(
      `INSERT INTO parent_details (student_id, parent_name, relationship, email, phone, whatsapp)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [studentId, resolveParentName(p), p.relationship, p.email || null, p.phone, p.whatsapp || null]
    );
  }
}

async function list(schoolId, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`s.school_id = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(s.name ILIKE $${params.length} OR s.roll_number ILIKE $${params.length})`);
  }
  if (filters.class) {
    params.push(filters.class);
    conditions.push(`s.class = $${params.length}`);
  }
  if (filters.division) {
    params.push(filters.division);
    conditions.push(`s.division = $${params.length}`);
  }
  if (filters.is_active !== undefined) {
    params.push(filters.is_active === 'true');
    conditions.push(`s.is_active = $${params.length}`);
  }
  if (filters.parentUserId) {
    params.push(filters.parentUserId);
    conditions.push(parentChildCondition(params.length));
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM students s ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY s.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const parentsByStudent = await getParentsByStudentId(rows.map((r) => r.id));
  return {
    students: rows.map((row) => toResponse(row, parentsByStudent[row.id] || [])),
    pagination: paginationMeta(page, pageSize, total),
  };
}

async function getById(id, schoolId, parentUserId) {
  const conditions = ['s.id = $1'];
  const params = [id];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`s.school_id = $${params.length}`);
  }
  if (parentUserId) {
    params.push(parentUserId);
    conditions.push(parentChildCondition(params.length));
  }
  const { rows } = await query(`${BASE_SELECT} WHERE ${conditions.join(' AND ')}`, params);
  if (!rows[0]) throw ApiError.notFound('Student not found');
  const parentsByStudent = await getParentsByStudentId([id]);
  return toResponse(rows[0], parentsByStudent[id] || []);
}

async function create(schoolId, data) {
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const id = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO students (school_id, name, class, division, roll_number, dob, gender,
         photo_url, student_qr_code, is_active, pickup_stop_id, drop_stop_id, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,true),$11,$12,$13)
       RETURNING id`,
      [
        schoolId, resolveName(data), resolveClass(data), data.division, data.roll_number, data.dob,
        data.gender || null, data.photo_url || null, generateQrCode('STD'), data.is_active,
        data.pickup_stop_id || null, data.drop_stop_id || null, data.address || null,
      ]
    );
    const studentId = rows[0].id;
    if (Array.isArray(data.parents) && data.parents.length) {
      await insertParents(client, studentId, data.parents);
    }
    return studentId;
  });
  return getById(id, schoolId);
}

async function update(id, schoolId, data) {
  await getById(id, schoolId);
  const studentId = await withTransaction(async (client) => {
    const sets = [];
    const params = [];
    const setField = (column, value) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };

    const name = resolveName(data);
    if (name !== undefined) setField('name', name);
    const klass = resolveClass(data);
    if (klass !== undefined) setField('class', klass);

    const directFields = [
      'division', 'roll_number', 'dob', 'gender', 'photo_url', 'is_active',
      'pickup_stop_id', 'drop_stop_id', 'address',
    ];
    for (const field of directFields) {
      if (data[field] !== undefined) setField(field, data[field]);
    }

    if (sets.length) {
      sets.push('updated_at = now()');
      params.push(id);
      await client.query(`UPDATE students SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    }

    // Replacing the whole parents array (delete-then-reinsert) keeps this simple and
    // matches the bulk-write style used elsewhere (e.g. buses.createMany transactions).
    if (data.parents !== undefined) {
      await client.query('DELETE FROM parent_details WHERE student_id = $1', [id]);
      if (Array.isArray(data.parents) && data.parents.length) {
        await insertParents(client, id, data.parents);
      }
    }

    return id;
  });
  return getById(studentId, schoolId);
}

async function remove(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
  const { rowCount } = await query(`DELETE FROM students WHERE ${where}`, params);
  if (!rowCount) throw ApiError.notFound('Student not found');
}

async function updateLocation(id, schoolId, field, stopId, driverUserId = null) {
  // Validate stop belongs to this school
  const { rows: stopRows } = await query(
    `SELECT s.id FROM stops s
     JOIN routes r ON r.id = s.route_id
     WHERE s.id = $1 AND r.school_id = $2`,
    [stopId, schoolId]
  );
  if (!stopRows[0]) throw ApiError.badRequest('Invalid stop ID or stop does not belong to your school');

  // Verify student exists
  const { rows: studentRows } = await query('SELECT id FROM students WHERE id = $1 AND school_id = $2', [id, schoolId]);
  if (!studentRows[0]) throw ApiError.notFound('Student not found');

  // Find active trip where this student's pickup/drop route matches the trip route
  const { rows: trips } = await query(
    `SELECT t.id FROM trips t 
     WHERE t.status = 'in_progress' AND (
       t.route_id = (SELECT route_id FROM stops WHERE id = (SELECT pickup_stop_id FROM students WHERE id = $1 LIMIT 1) LIMIT 1) OR
       t.route_id = (SELECT route_id FROM stops WHERE id = (SELECT drop_stop_id FROM students WHERE id = $1 LIMIT 1) LIMIT 1)
     )
     ORDER BY t.started_at DESC LIMIT 1`,
    [id]
  );

  if (!trips[0]) {
    throw ApiError.badRequest('No active trip found for this student. Locations can only be overridden during an active trip.');
  }

  const tripId = trips[0].id;
  const column = field === 'pickup' ? 'override_pickup_stop_id' : 'override_drop_stop_id';
  
  await query(
    `INSERT INTO trip_student_overrides (trip_id, student_id, ${column})
     VALUES ($1, $2, $3)
     ON CONFLICT (trip_id, student_id) 
     DO UPDATE SET ${column} = $3, updated_at = now()`,
    [tripId, id, stopId]
  );
  
  return getById(id, schoolId);
}

/**
 * Sets where a parent wants to be notified as the bus approaches (a pure
 * preference), independent of updateLocation's same-day pickup/drop stop
 * override — this never touches pickup_stop_id/drop_stop_id and has no
 * active-trip requirement, so it can be set any time, on any stop on the
 * student's route.
 */
async function updateAlertStop(id, schoolId, field, stopId, parentUserId) {
  const { rows: stopRows } = await query(
    `SELECT s.id FROM stops s
     JOIN routes r ON r.id = s.route_id
     WHERE s.id = $1 AND r.school_id = $2`,
    [stopId, schoolId]
  );
  if (!stopRows[0]) throw ApiError.badRequest('Invalid stop ID or stop does not belong to your school');

  // Confirms the student exists (and, for a parent caller, belongs to them) — 404s otherwise.
  await getById(id, schoolId, parentUserId);

  const column = field === 'pickup' ? 'alert_pickup_stop_id' : 'alert_drop_stop_id';
  await query(`UPDATE students SET ${column} = $1, updated_at = now() WHERE id = $2`, [stopId, id]);

  return getById(id, schoolId, parentUserId);
}

module.exports = { list, getById, create, update, remove, updateLocation, updateAlertStop };
