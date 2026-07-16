const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');

// Roles a school_admin (as opposed to a super_admin) is allowed to manage.
const SCHOOL_ADMIN_MANAGEABLE_ROLES = ['driver', 'guest_driver', 'parent'];

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.phone, u.role, u.school_id,
         s.name AS school_name, u.avatar, u.fcm_token, u.created_at, u.last_login
  FROM users u
  LEFT JOIN schools s ON s.id = u.school_id
`;

function toResponse(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || undefined,
    role: row.role,
    school_id: row.school_id || undefined,
    school_name: row.school_name || undefined,
    avatar: row.avatar || undefined,
    fcm_token: row.fcm_token || undefined,
    created_at: row.created_at,
    last_login: row.last_login || undefined,
  };
}

function assertManageableRole(actorRole, role) {
  if (actorRole !== 'super_admin' && !SCHOOL_ADMIN_MANAGEABLE_ROLES.includes(role)) {
    throw ApiError.forbidden('You do not have permission to manage this type of account');
  }
}

async function list(schoolId, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`u.school_id = $${params.length}`);
  }
  if (filters.role) {
    params.push(filters.role);
    conditions.push(`u.role = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM users u ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${USER_SELECT} ${where} ORDER BY u.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { users: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'WHERE u.id = $1 AND u.school_id = $2' : 'WHERE u.id = $1';
  const { rows } = await query(`${USER_SELECT} ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('User not found');
  return toResponse(rows[0]);
}

/**
 * Creates a user. `actorRole` is the caller's own role: a school_admin may only
 * create driver/guest_driver/parent accounts, scoped to their own school_id
 * (passed in as `schoolId`, resolved via resolveSchoolId in the controller).
 * A super_admin may create any role, optionally attached to any school (or none).
 */
async function create(actorRole, schoolId, data) {
  assertManageableRole(actorRole, data.role);
  if (actorRole !== 'super_admin' && !schoolId) {
    throw ApiError.forbidden('Account is not associated with a school');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, phone, role, school_id, avatar, fcm_token)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      data.name,
      data.email.trim().toLowerCase(),
      passwordHash,
      data.phone || null,
      data.role,
      schoolId || null,
      data.avatar || null,
      data.fcm_token || null,
    ]
  );
  return getById(rows[0].id, null);
}

/**
 * Updates a user. `schoolId` (from resolveSchoolId) scopes which record a
 * school_admin may touch; super_admin passes schoolId = null (unscoped).
 */
async function update(id, actorRole, schoolId, data) {
  const existing = await getById(id, schoolId);
  assertManageableRole(actorRole, existing.role);
  if (data.role !== undefined) assertManageableRole(actorRole, data.role);

  const fields = ['name', 'email', 'phone', 'role', 'avatar', 'fcm_token'];
  if (actorRole === 'super_admin') fields.push('school_id');

  const sets = [];
  const params = [];
  for (const field of fields) {
    if (data[field] !== undefined) {
      params.push(field === 'email' ? String(data[field]).trim().toLowerCase() : data[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }
  if (data.password) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    params.push(passwordHash);
    sets.push(`password_hash = $${params.length}`);
  }
  if (sets.length === 0) return getById(id, schoolId);
  sets.push('updated_at = now()');
  params.push(id);
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return getById(id, null);
}

async function remove(id, actorRole, schoolId) {
  const existing = await getById(id, schoolId);
  assertManageableRole(actorRole, existing.role);
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('User not found');
}

module.exports = { toResponse, list, getById, create, update, remove };
