const { masterPool, getTenantPool } = require('../../config/db');
const { runMigrationsOnPool } = require('../../db/migrate');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');

// schools.* always reads/writes the MASTER database explicitly (never the
// ambient tenant-context-routed `query()` from config/db) — every tenant DB
// also carries its own local copy of its own school row (seeded once at
// creation, purely to satisfy local FKs like buses.school_id), so relying on
// ambient context here would silently update/read whichever copy happens to
// match the caller's role: master for a super_admin request, the tenant
// mirror for a school_admin one. Master is the single source of truth; see
// syncTenantMirror below for how the mirror is kept from going stale.

const BASE_SELECT = `
  SELECT sc.*, p.name AS plan_name,
    (SELECT COUNT(*) FROM students st WHERE st.school_id = sc.id)::int AS student_count,
    (SELECT COUNT(*) FROM drivers d WHERE d.school_id = sc.id)::int AS driver_count,
    (SELECT COUNT(*) FROM buses b WHERE b.school_id = sc.id)::int AS bus_count,
    (SELECT COUNT(*) FROM routes r WHERE r.school_id = sc.id)::int AS route_count
  FROM schools sc
  JOIN plans p ON p.id = sc.plan_id
`;

function toResponse(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    post_code: row.post_code || undefined,
    country: row.country || undefined,
    phone: row.phone,
    email: row.email,
    website: row.website || undefined,
    plan_id: row.plan_id,
    plan_name: row.plan_name,
    status: row.status,
    subdomain: row.subdomain,
    student_count: row.student_count,
    driver_count: row.driver_count,
    bus_count: row.bus_count,
    route_count: row.route_count,
    admin_name: row.admin_name || undefined,
    admin_email: row.admin_email || undefined,
    created_at: row.created_at,
    logo_url: row.logo_url || undefined,
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
  };
}

async function list({ page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(sc.name ILIKE $${params.length} OR sc.email ILIKE $${params.length})`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`sc.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await masterPool.query(`SELECT COUNT(*)::int AS total FROM schools sc ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await masterPool.query(
    `${BASE_SELECT} ${where} ORDER BY sc.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { schools: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id) {
  const { rows } = await masterPool.query(`${BASE_SELECT} WHERE sc.id = $1`, [id]);
  if (!rows[0]) throw ApiError.notFound('School not found');
  return toResponse(rows[0]);
}

/** Keeps a tenant DB's own local schools-row mirror (needed only so
 * buses.school_id/users.school_id FKs resolve locally) from drifting away
 * from the master record. Best-effort: a school with no tenant DB yet, or a
 * momentarily-unreachable one, shouldn't block the authoritative master write. */
async function syncTenantMirror(id, sets, params) {
  try {
    const tenantPool = getTenantPool(`smarttrack_${id.replace('-', '_').toLowerCase()}`);
    await tenantPool.query(`UPDATE schools SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  } catch (err) {
    console.error(`Warning: failed to sync school ${id} into its tenant DB mirror:`, err.message);
  }
}

async function create(data) {
  const { rows } = await masterPool.query(
    `INSERT INTO schools (id, name, address, city, state, post_code, country, phone, email, website,
       plan_id, subdomain, admin_name, admin_email, logo_url, status, latitude, longitude)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,COALESCE($16,'pending'),$17,$18)
     RETURNING *`,
    [
      data.school_code, data.name, data.address, data.city, data.state, data.post_code, data.country,
      data.phone, data.email, data.website, data.plan_id, data.subdomain,
      data.admin_name, data.admin_email, data.logo_url, data.status,
      data.latitude, data.longitude,
    ]
  );
  const school = rows[0];
  const schoolId = school.id;
  const dbName = `smarttrack_${schoolId.replace('-', '_').toLowerCase()}`;

  // 1. Create the database
  try {
    await masterPool.query(`CREATE DATABASE "${dbName}"`);
  } catch (err) {
    console.error(`Warning: Failed to create database ${dbName} (might already exist):`, err.message);
  }

  // 2. Run migrations on the new database
  const tenantPool = getTenantPool(dbName);
  try {
    await runMigrationsOnPool(tenantPool, dbName);
  } catch (err) {
    console.error(`Failed to run migrations for new school ${dbName}:`, err);
    throw ApiError.badRequest(`School created, but database provisioning failed: ${err.message}`);
  }

  // 3. Mirror the plan + school row into the tenant DB — buses.school_id,
  // users.school_id etc. all carry a local FK to this DB's own schools row,
  // so those inserts would fail without it.
  try {
    const { rows: planRows } = await masterPool.query('SELECT * FROM plans WHERE id = $1', [data.plan_id]);
    const p = planRows[0];
    if (p) {
      await tenantPool.query(
        `INSERT INTO plans (id, name, label, price_monthly, price_annual, price_per_student, billing_cycle, max_students, max_buses, max_drivers, features, is_popular)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [p.id, p.name, p.label, p.price_monthly, p.price_annual, p.price_per_student, p.billing_cycle, p.max_students, p.max_buses, p.max_drivers, JSON.stringify(p.features), p.is_popular]
      );
    }
    await tenantPool.query(
      `INSERT INTO schools (id, name, address, city, state, post_code, country, phone, email, website,
         plan_id, subdomain, admin_name, admin_email, logo_url, status, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        school.id, school.name, school.address, school.city, school.state, school.post_code, school.country,
        school.phone, school.email, school.website, school.plan_id, school.subdomain,
        school.admin_name, school.admin_email, school.logo_url, school.status,
        school.latitude, school.longitude,
      ]
    );
  } catch (err) {
    console.error(`Warning: failed to mirror school ${schoolId} into its tenant DB:`, err.message);
  }

  return getById(schoolId);
}

async function update(id, data) {
  await getById(id);
  const fields = [
    'name', 'address', 'city', 'state', 'post_code', 'country', 'phone', 'email', 'website',
    'plan_id', 'subdomain', 'admin_name', 'admin_email', 'logo_url', 'status', 'latitude', 'longitude',
  ];
  const sets = [];
  const params = [];
  for (const field of fields) {
    if (data[field] !== undefined) {
      params.push(data[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getById(id);
  sets.push('updated_at = now()');
  params.push(id);
  await masterPool.query(`UPDATE schools SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  await syncTenantMirror(id, sets, params);
  return getById(id);
}

async function remove(id) {
  const { rowCount } = await masterPool.query('DELETE FROM schools WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('School not found');
}

module.exports = { list, getById, create, update, remove };
