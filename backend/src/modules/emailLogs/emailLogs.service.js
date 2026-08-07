const { query } = require('../../config/db');
const { parsePagination, paginationMeta } = require('../../utils/pagination');

function toResponse(row) {
  return {
    id: row.id,
    school_id: row.school_id || undefined,
    school_name: row.school_name || undefined,
    user_id: row.user_id || undefined,
    recipient_email: row.recipient_email,
    subject: row.subject,
    body: row.body,
    trigger_type: row.trigger_type,
    status: row.status,
    error_message: row.error_message || undefined,
    sent_at: row.sent_at,
  };
}

async function list({ page, pageSize, offset }) {
  const { rows: countRows } = await query('SELECT COUNT(*)::int AS total FROM email_logs');
  const total = countRows[0].total;

  const { rows } = await query(
    `SELECT e.*, s.name AS school_name
     FROM email_logs e
     LEFT JOIN schools s ON s.id = e.school_id
     ORDER BY e.sent_at DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );

  return { emailLogs: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

module.exports = { list };
