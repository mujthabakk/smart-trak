const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');

function toResponse(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    video_url: row.video_url,
    thumbnail_url: row.thumbnail_url || undefined,
    target_role: row.target_role,
    is_published: row.is_published,
    created_at: row.created_at,
    view_count: row.view_count,
    duration_mins: row.duration_mins || undefined,
  };
}

/** Platform-wide content library — no school scoping. super_admin browses the
 * full catalog (optionally filtered); every other role only ever sees
 * published modules targeted at their own role. */
async function list(user, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];

  if (user.role === 'super_admin') {
    if (filters.target_role) {
      params.push(filters.target_role);
      conditions.push(`target_role = $${params.length}`);
    }
    if (filters.is_published !== undefined) {
      params.push(filters.is_published === 'true');
      conditions.push(`is_published = $${params.length}`);
    }
  } else {
    params.push(true);
    conditions.push(`is_published = $${params.length}`);
    params.push(user.role);
    conditions.push(`target_role = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM training_modules ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `SELECT * FROM training_modules ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { trainingModules: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

/** Non-admin viewers (everyone except super_admin) can only reach published
 * modules targeted at their own role, and each fetch bumps view_count. */
async function getById(id, user) {
  const { rows } = await query('SELECT * FROM training_modules WHERE id = $1', [id]);
  const row = rows[0];
  if (!row) throw ApiError.notFound('Training module not found');

  if (user.role !== 'super_admin') {
    if (!row.is_published || row.target_role !== user.role) {
      throw ApiError.notFound('Training module not found');
    }
    const { rows: updated } = await query(
      'UPDATE training_modules SET view_count = view_count + 1 WHERE id = $1 RETURNING *',
      [id]
    );
    return toResponse(updated[0]);
  }

  return toResponse(row);
}

async function create(data) {
  const { rows } = await query(
    `INSERT INTO training_modules (title, description, video_url, thumbnail_url, target_role, is_published, duration_mins)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,false),$7)
     RETURNING id`,
    [
      data.title, data.description, data.video_url, data.thumbnail_url || null,
      data.target_role, data.is_published, data.duration_mins || null,
    ]
  );
  const { rows: created } = await query('SELECT * FROM training_modules WHERE id = $1', [rows[0].id]);
  return toResponse(created[0]);
}

async function update(id, data) {
  const { rows: existingRows } = await query('SELECT * FROM training_modules WHERE id = $1', [id]);
  if (!existingRows[0]) throw ApiError.notFound('Training module not found');

  const fields = ['title', 'description', 'video_url', 'thumbnail_url', 'target_role', 'is_published', 'duration_mins'];
  const sets = [];
  const params = [];
  for (const field of fields) {
    if (data[field] !== undefined) {
      params.push(data[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }
  if (sets.length === 0) return toResponse(existingRows[0]);

  params.push(id);
  const { rows } = await query(
    `UPDATE training_modules SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return toResponse(rows[0]);
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM training_modules WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('Training module not found');
}

module.exports = { list, getById, create, update, remove };
