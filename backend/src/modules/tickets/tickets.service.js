const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { paginationMeta } = require('../../utils/pagination');

const BASE_SELECT = `
  SELECT t.*, sc.name AS school_name, u.name AS reporter_name, u.role AS reporter_role
  FROM support_tickets t
  LEFT JOIN schools sc ON sc.id = t.school_id
  JOIN users u ON u.id = t.reporter_id
`;

function toResponse(row, replies = []) {
  return {
    id: row.id,
    school_id: row.school_id || undefined,
    school_name: row.school_name || undefined,
    reporter_id: row.reporter_id,
    reporter_name: row.reporter_name,
    reporter_role: row.reporter_role,
    type: row.type,
    priority: row.priority,
    status: row.status,
    description: row.description,
    assigned_to: row.assigned_to || undefined,
    created_at: row.created_at,
    replies: replies.map(replyToResponse),
  };
}

function replyToResponse(row) {
  return {
    id: row.id,
    ticket_id: row.ticket_id,
    user_id: row.user_id,
    user_name: row.user_name,
    user_role: row.user_role,
    content: row.content,
    created_at: row.created_at,
  };
}

/** Fetches replies (with author name/role) for a batch of ticket ids, grouped by ticket_id. */
async function getRepliesForTickets(ticketIds) {
  if (!ticketIds.length) return {};
  const { rows } = await query(
    `SELECT r.*, u.name AS user_name, u.role AS user_role
     FROM ticket_replies r
     JOIN users u ON u.id = r.user_id
     WHERE r.ticket_id = ANY($1)
     ORDER BY r.created_at ASC`,
    [ticketIds]
  );
  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.ticket_id]) grouped[row.ticket_id] = [];
    grouped[row.ticket_id].push(row);
  }
  return grouped;
}

/** super_admin sees every ticket (it's the support desk); everyone else only sees
 * tickets scoped to their own school or ones they personally reported. */
function canView(row, user) {
  if (user.role === 'super_admin') return true;
  return (row.school_id && row.school_id === user.school_id) || row.reporter_id === user.id;
}

async function list(user, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];

  if (user.role === 'super_admin') {
    if (filters.school_id) {
      params.push(filters.school_id);
      conditions.push(`t.school_id = $${params.length}`);
    }
  } else {
    params.push(user.school_id || null);
    params.push(user.id);
    conditions.push(`(t.school_id = $${params.length - 1} OR t.reporter_id = $${params.length})`);
  }

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`t.status = $${params.length}`);
  }
  if (filters.priority) {
    params.push(filters.priority);
    conditions.push(`t.priority = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM support_tickets t ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY t.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const repliesByTicket = await getRepliesForTickets(rows.map((row) => row.id));
  const tickets = rows.map((row) => toResponse(row, repliesByTicket[row.id] || []));

  return { tickets, pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, user) {
  const { rows } = await query(`${BASE_SELECT} WHERE t.id = $1`, [id]);
  const row = rows[0];
  if (!row) throw ApiError.notFound('Ticket not found');
  if (!canView(row, user)) throw ApiError.notFound('Ticket not found');

  const repliesByTicket = await getRepliesForTickets([id]);
  return toResponse(row, repliesByTicket[id] || []);
}

async function create(user, data) {
  const schoolId = user.school_id || null;
  const { rows } = await query(
    `INSERT INTO support_tickets (school_id, reporter_id, type, priority, description)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id`,
    [schoolId, user.id, data.type, data.priority || 'medium', data.description]
  );
  return getById(rows[0].id, user);
}

async function update(id, user, data) {
  const { rows } = await query('SELECT * FROM support_tickets WHERE id = $1', [id]);
  const ticket = rows[0];
  if (!ticket) throw ApiError.notFound('Ticket not found');

  const isSuperAdmin = user.role === 'super_admin';
  const isReporter = ticket.reporter_id === user.id;

  if (!isSuperAdmin && !isReporter) {
    throw ApiError.forbidden('You do not have permission to update this ticket');
  }

  if (
    (data.status !== undefined || data.priority !== undefined || data.assigned_to !== undefined) &&
    !isSuperAdmin
  ) {
    throw ApiError.forbidden('Only super admins can update status, priority or assignment');
  }

  if (data.description !== undefined && !isSuperAdmin) {
    if (ticket.status !== 'open') {
      throw ApiError.forbidden('Description can only be edited while the ticket is open');
    }
  }

  const fields = ['status', 'priority', 'assigned_to', 'description'];
  const sets = [];
  const params = [];
  for (const field of fields) {
    if (data[field] !== undefined) {
      params.push(data[field]);
      sets.push(`${field} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getById(id, user);

  sets.push('updated_at = now()');
  params.push(id);
  await query(`UPDATE support_tickets SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  return getById(id, user);
}

async function addReply(ticketId, user, content) {
  const { rows } = await query('SELECT * FROM support_tickets WHERE id = $1', [ticketId]);
  const ticket = rows[0];
  if (!ticket) throw ApiError.notFound('Ticket not found');

  const canReply =
    user.role === 'super_admin' || ticket.reporter_id === user.id || ticket.assigned_to === user.id;
  if (!canReply) throw ApiError.forbidden('You do not have permission to reply to this ticket');

  await query('INSERT INTO ticket_replies (ticket_id, user_id, content) VALUES ($1,$2,$3)', [
    ticketId,
    user.id,
    content,
  ]);
  return getById(ticketId, user);
}

module.exports = { list, getById, create, update, addReply };
