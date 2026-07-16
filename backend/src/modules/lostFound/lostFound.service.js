const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');

const BASE_SELECT = `
  SELECT lf.*, b.bus_number, d.name AS driver_name
  FROM lost_found_items lf
  JOIN buses b ON b.id = lf.bus_id
  JOIN drivers d ON d.id = lf.driver_id
`;

const CLAIM_SELECT = `
  SELECT c.*, s.name AS student_name
  FROM lf_claims c
  JOIN students s ON s.id = c.student_id
`;

function toResponse(row) {
  return {
    id: row.id,
    school_id: row.school_id,
    bus_id: row.bus_id,
    bus_number: row.bus_number,
    driver_id: row.driver_id,
    driver_name: row.driver_name,
    description: row.description,
    photo_url: row.photo_url || undefined,
    image_url: row.image_url || undefined,
    reported_at: row.reported_at,
    status: row.status,
  };
}

function toClaimResponse(row) {
  return {
    id: row.id,
    lost_found_id: row.lost_found_id,
    student_id: row.student_id,
    student_name: row.student_name,
    claim_note: row.claim_note || undefined,
    status: row.status,
    claimed_at: row.claimed_at || undefined,
  };
}

async function getClaimsForItem(lostFoundId) {
  const { rows } = await query(`${CLAIM_SELECT} WHERE c.lost_found_id = $1 ORDER BY c.id`, [lostFoundId]);
  return rows.map(toClaimResponse);
}

/** Batches claim lookups for a page of items so list() doesn't N+1 query. */
async function getClaimsForItems(itemIds) {
  if (itemIds.length === 0) return {};
  const { rows } = await query(
    `${CLAIM_SELECT} WHERE c.lost_found_id = ANY($1::text[]) ORDER BY c.id`,
    [itemIds]
  );
  const grouped = {};
  for (const row of rows) {
    const claim = toClaimResponse(row);
    (grouped[row.lost_found_id] ||= []).push(claim);
  }
  return grouped;
}

async function getClaimById(claimId) {
  const { rows } = await query(`${CLAIM_SELECT} WHERE c.id = $1`, [claimId]);
  if (!rows[0]) throw ApiError.notFound('Claim not found');
  return toClaimResponse(rows[0]);
}

async function list(schoolId, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`lf.school_id = $${params.length}`);
  }
  if (filters.bus_id) {
    params.push(filters.bus_id);
    conditions.push(`lf.bus_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`lf.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM lost_found_items lf ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY lf.reported_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const claimsByItem = await getClaimsForItems(rows.map((r) => r.id));
  const items = rows.map((row) => ({ ...toResponse(row), claims: claimsByItem[row.id] || [] }));

  return { items, pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'WHERE lf.id = $1 AND lf.school_id = $2' : 'WHERE lf.id = $1';
  const { rows } = await query(`${BASE_SELECT} ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('Lost & found item not found');
  const claims = await getClaimsForItem(rows[0].id);
  return { ...toResponse(rows[0]), claims };
}

async function create(schoolId, data) {
  const { rows } = await query(
    `INSERT INTO lost_found_items (school_id, bus_id, driver_id, description, photo_url, image_url)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [schoolId, data.bus_id, data.driver_id, data.description, data.photo_url || null, data.image_url || null]
  );
  return getById(rows[0].id, schoolId);
}

async function update(id, schoolId, data) {
  await getById(id, schoolId);
  const fields = ['description', 'status', 'photo_url', 'image_url'];
  const sets = [];
  const params = [];
  for (const field of fields) {
    if (data[field] !== undefined) {
      params.push(data[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getById(id, schoolId);
  params.push(id);
  await query(`UPDATE lost_found_items SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return getById(id, schoolId);
}

async function remove(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
  const { rowCount } = await query(`DELETE FROM lost_found_items WHERE ${where}`, params);
  if (!rowCount) throw ApiError.notFound('Lost & found item not found');
}

/** Records a claim; the item transitions reported -> claimed on its first claim. */
async function addClaim(id, schoolId, data) {
  const claimId = await withTransaction(async (client) => {
    const itemParams = schoolId ? [id, schoolId] : [id];
    const itemWhere = schoolId ? 'WHERE id = $1 AND school_id = $2' : 'WHERE id = $1';
    const { rows: itemRows } = await client.query(
      `SELECT * FROM lost_found_items ${itemWhere} FOR UPDATE`,
      itemParams
    );
    if (!itemRows[0]) throw ApiError.notFound('Lost & found item not found');

    const { rows: claimRows } = await client.query(
      `INSERT INTO lf_claims (lost_found_id, student_id, claim_note)
       VALUES ($1,$2,$3)
       RETURNING id`,
      [id, data.student_id, data.claim_note || null]
    );

    const { rows: countRows } = await client.query(
      `SELECT COUNT(*)::int AS total FROM lf_claims WHERE lost_found_id = $1`,
      [id]
    );
    if (countRows[0].total === 1 && itemRows[0].status === 'reported') {
      await client.query(`UPDATE lost_found_items SET status = 'claimed' WHERE id = $1`, [id]);
    }

    return claimRows[0].id;
  });
  return getClaimById(claimId);
}

/** Updating a claim to 'resolved' also resolves the parent item and stamps claimed_at. */
async function updateClaim(id, claimId, schoolId, data) {
  const resolvedClaimId = await withTransaction(async (client) => {
    const itemParams = schoolId ? [id, schoolId] : [id];
    const itemWhere = schoolId ? 'WHERE id = $1 AND school_id = $2' : 'WHERE id = $1';
    const { rows: itemRows } = await client.query(
      `SELECT * FROM lost_found_items ${itemWhere} FOR UPDATE`,
      itemParams
    );
    if (!itemRows[0]) throw ApiError.notFound('Lost & found item not found');

    const { rows: claimRows } = await client.query(
      `SELECT * FROM lf_claims WHERE id = $1 AND lost_found_id = $2`,
      [claimId, id]
    );
    if (!claimRows[0]) throw ApiError.notFound('Claim not found');

    const sets = [];
    const params = [];
    if (data.status !== undefined) {
      params.push(data.status);
      sets.push(`status = $${params.length}`);
      if (data.status === 'resolved') {
        sets.push('claimed_at = now()');
      }
    }
    if (data.claim_note !== undefined) {
      params.push(data.claim_note);
      sets.push(`claim_note = $${params.length}`);
    }
    if (sets.length > 0) {
      params.push(claimId);
      await client.query(`UPDATE lf_claims SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    }

    if (data.status === 'resolved') {
      await client.query(`UPDATE lost_found_items SET status = 'resolved' WHERE id = $1`, [id]);
    }

    return claimId;
  });
  return getClaimById(resolvedClaimId);
}

module.exports = { list, getById, create, update, remove, addClaim, updateClaim };
