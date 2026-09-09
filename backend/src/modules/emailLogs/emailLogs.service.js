const { masterPool, getTenantPool } = require('../../config/db');
const { paginationMeta } = require('../../utils/pagination');

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

const SELECT_LOGS = `
  SELECT e.*, s.name AS school_name
  FROM email_logs e
  LEFT JOIN schools s ON s.id = e.school_id
`;

/** email_logs is written wherever the sending request's tenant context
 * happened to point (a school_admin's own tenant DB, or master for a
 * super_admin/school-less request) — so a super_admin listing needs to fan
 * out across master + every school's tenant DB, the same way schools.service
 * treats master as authoritative but reaches into tenant DBs explicitly when
 * it needs tenant-local data. */
async function fetchAllRows() {
  const { rows: schools } = await masterPool.query('SELECT id FROM schools');
  const pools = [
    masterPool,
    ...schools.map((s) => getTenantPool(`smarttrack_${s.id.replace('-', '_').toLowerCase()}`)),
  ];

  const results = await Promise.all(
    pools.map((pool) =>
      pool.query(SELECT_LOGS).then(
        ({ rows }) => rows,
        (err) => {
          console.error('Failed to read email_logs from a tenant database:', err.message);
          return [];
        }
      )
    )
  );
  return results.flat();
}

async function list({ page, pageSize, offset }) {
  const allRows = await fetchAllRows();
  allRows.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));

  const total = allRows.length;
  const pageRows = allRows.slice(offset, offset + pageSize);

  return { emailLogs: pageRows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

module.exports = { list };
