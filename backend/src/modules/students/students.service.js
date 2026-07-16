const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');
const { generateQrCode } = require('../../utils/qrcode');

// route_name is derived by following pickup_stop_id -> stops.route_id -> routes.name,
// falling back to the drop stop's route when there's no pickup stop set.
const BASE_SELECT = `
  SELECT s.*, COALESCE(pr.name, dr.name) AS route_name
  FROM students s
  LEFT JOIN stops ps ON ps.id = s.pickup_stop_id
  LEFT JOIN routes pr ON pr.id = ps.route_id
  LEFT JOIN stops ds ON ds.id = s.drop_stop_id
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
    route_name: row.route_name || undefined,
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

async function getById(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'WHERE s.id = $1 AND s.school_id = $2' : 'WHERE s.id = $1';
  const { rows } = await query(`${BASE_SELECT} ${where}`, params);
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

module.exports = { list, getById, create, update, remove };
