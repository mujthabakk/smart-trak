const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');

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

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM schools sc ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY sc.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { schools: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id) {
  const { rows } = await query(`${BASE_SELECT} WHERE sc.id = $1`, [id]);
  if (!rows[0]) throw ApiError.notFound('School not found');
  return toResponse(rows[0]);
}

async function create(data) {
  const { rows } = await query(
    `INSERT INTO schools (name, address, city, state, post_code, country, phone, email, website,
       plan_id, subdomain, admin_name, admin_email, logo_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,COALESCE($15,'pending'))
     RETURNING id`,
    [
      data.name, data.address, data.city, data.state, data.post_code, data.country,
      data.phone, data.email, data.website, data.plan_id, data.subdomain,
      data.admin_name, data.admin_email, data.logo_url, data.status,
    ]
  );
  return getById(rows[0].id);
}

async function update(id, data) {
  await getById(id);
  const fields = [
    'name', 'address', 'city', 'state', 'post_code', 'country', 'phone', 'email', 'website',
    'plan_id', 'subdomain', 'admin_name', 'admin_email', 'logo_url', 'status',
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
  await query(`UPDATE schools SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return getById(id);
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM schools WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('School not found');
}

module.exports = { list, getById, create, update, remove };
