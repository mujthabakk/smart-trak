const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

function toClassResponse(row, divisions) {
  return {
    id: row.id,
    name: row.name,
    order_index: row.order_index,
    divisions: divisions.map((d) => ({ id: d.id, name: d.name })),
  };
}

/** Every class with its divisions nested — small, school-scoped lists (a
 * handful of classes, a handful of divisions each), so one query per table
 * beats N+1 per-class division lookups. */
async function list(schoolId) {
  const { rows: classRows } = await query(
    'SELECT * FROM classes WHERE school_id = $1 ORDER BY order_index ASC, name ASC',
    [schoolId]
  );
  if (classRows.length === 0) return { classes: [] };

  const classIds = classRows.map((c) => c.id);
  const { rows: divisionRows } = await query(
    'SELECT * FROM divisions WHERE class_id = ANY($1::text[]) ORDER BY name ASC',
    [classIds]
  );

  return {
    classes: classRows.map((c) => toClassResponse(c, divisionRows.filter((d) => d.class_id === c.id))),
  };
}

async function create(schoolId, data) {
  const { rows: maxRows } = await query(
    'SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM classes WHERE school_id = $1',
    [schoolId]
  );
  const orderIndex = maxRows[0].next;
  const { rows } = await query(
    'INSERT INTO classes (school_id, name, order_index) VALUES ($1,$2,$3) RETURNING *',
    [schoolId, data.name.trim(), orderIndex]
  );
  return toClassResponse(rows[0], []);
}

async function remove(id, schoolId) {
  const { rowCount } = await query('DELETE FROM classes WHERE id = $1 AND school_id = $2', [id, schoolId]);
  if (!rowCount) throw ApiError.notFound('Class not found');
}

async function addDivision(classId, schoolId, data) {
  const { rows: classRows } = await query('SELECT id FROM classes WHERE id = $1 AND school_id = $2', [classId, schoolId]);
  if (!classRows[0]) throw ApiError.notFound('Class not found');

  const { rows } = await query(
    'INSERT INTO divisions (class_id, school_id, name) VALUES ($1,$2,$3) RETURNING *',
    [classId, schoolId, data.name.trim()]
  );
  return { id: rows[0].id, name: rows[0].name };
}

async function removeDivision(classId, divisionId, schoolId) {
  const { rowCount } = await query(
    'DELETE FROM divisions WHERE id = $1 AND class_id = $2 AND school_id = $3',
    [divisionId, classId, schoolId]
  );
  if (!rowCount) throw ApiError.notFound('Division not found');
}

module.exports = { list, create, remove, addDivision, removeDivision };
