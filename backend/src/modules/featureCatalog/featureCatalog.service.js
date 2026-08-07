const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

function toResponse(row) {
  return { id: row.id, name: row.name, created_at: row.created_at };
}

async function list() {
  const { rows } = await query('SELECT * FROM plan_feature_catalog ORDER BY name ASC');
  return rows.map(toResponse);
}

async function create(data) {
  const { rows } = await query(
    'INSERT INTO plan_feature_catalog (name) VALUES ($1) RETURNING *',
    [data.name]
  );
  return toResponse(rows[0]);
}

async function update(id, data) {
  const { rows: existingRows } = await query('SELECT * FROM plan_feature_catalog WHERE id = $1', [id]);
  if (!existingRows[0]) throw ApiError.notFound('Feature not found');

  const { rows } = await query(
    'UPDATE plan_feature_catalog SET name = COALESCE($1, name) WHERE id = $2 RETURNING *',
    [data.name, id]
  );
  return toResponse(rows[0]);
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM plan_feature_catalog WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('Feature not found');
}

module.exports = { list, create, update, remove };
