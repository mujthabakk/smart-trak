const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');

const BASE_SELECT = `
  SELECT sub.*, sc.name AS school_name, p.name AS plan_name
  FROM subscriptions sub
  JOIN schools sc ON sc.id = sub.school_id
  JOIN plans p ON p.id = sub.plan_id
`;

function toResponse(row) {
  return {
    id: row.id,
    school_id: row.school_id,
    school_name: row.school_name,
    plan_id: row.plan_id,
    plan_name: row.plan_name,
    start_date: row.start_date,
    end_date: row.end_date,
    amount_paid: Number(row.amount_paid),
    payment_method: row.payment_method,
    status: row.status,
  };
}

async function list({ page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (filters.school_id) {
    params.push(filters.school_id);
    conditions.push(`sub.school_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`sub.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM subscriptions sub ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY sub.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { subscriptions: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id) {
  const { rows } = await query(`${BASE_SELECT} WHERE sub.id = $1`, [id]);
  if (!rows[0]) throw ApiError.notFound('Subscription not found');
  return toResponse(rows[0]);
}

async function create(data) {
  const { rows } = await query(
    `INSERT INTO subscriptions (school_id, plan_id, start_date, end_date, amount_paid, payment_method, status)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'active'))
     RETURNING id`,
    [data.school_id, data.plan_id, data.start_date, data.end_date, data.amount_paid, data.payment_method, data.status]
  );
  return getById(rows[0].id);
}

async function update(id, data) {
  await getById(id);
  const fields = ['plan_id', 'start_date', 'end_date', 'amount_paid', 'payment_method', 'status'];
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
  await query(`UPDATE subscriptions SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return getById(id);
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM subscriptions WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('Subscription not found');
}

module.exports = { list, getById, create, update, remove };
