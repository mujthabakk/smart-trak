const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

function toResponse(row) {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    price_monthly: Number(row.price_monthly),
    price_annual: Number(row.price_annual),
    price_per_student: Number(row.price_per_student),
    billing_cycle: row.billing_cycle,
    max_students: row.max_students,
    max_buses: row.max_buses,
    max_drivers: row.max_drivers,
    features: row.features,
    is_popular: row.is_popular,
  };
}

async function list() {
  const { rows } = await query('SELECT * FROM plans ORDER BY price_monthly ASC');
  return rows.map(toResponse);
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM plans WHERE id = $1', [id]);
  if (!rows[0]) throw ApiError.notFound('Plan not found');
  return toResponse(rows[0]);
}

async function create(data) {
  const id = data.id || data.name.toLowerCase().replace(/\s+/g, '_');
  const { rows } = await query(
    `INSERT INTO plans (id, name, label, price_monthly, price_annual, price_per_student,
       billing_cycle, max_students, max_buses, max_drivers, features, is_popular)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      id, data.name, data.label, data.price_monthly, data.price_annual, data.price_per_student,
      data.billing_cycle, data.max_students, data.max_buses, data.max_drivers,
      data.features || [], data.is_popular || false,
    ]
  );
  return toResponse(rows[0]);
}

async function update(id, data) {
  const existing = await getById(id);
  const merged = { ...existing, ...data };
  const { rows } = await query(
    `UPDATE plans SET name=$1, label=$2, price_monthly=$3, price_annual=$4, price_per_student=$5,
       billing_cycle=$6, max_students=$7, max_buses=$8, max_drivers=$9, features=$10,
       is_popular=$11, updated_at=now()
     WHERE id=$12 RETURNING *`,
    [
      merged.name, merged.label, merged.price_monthly, merged.price_annual, merged.price_per_student,
      merged.billing_cycle, merged.max_students, merged.max_buses, merged.max_drivers, merged.features,
      merged.is_popular, id,
    ]
  );
  return toResponse(rows[0]);
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM plans WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('Plan not found');
}

module.exports = { list, getById, create, update, remove };
