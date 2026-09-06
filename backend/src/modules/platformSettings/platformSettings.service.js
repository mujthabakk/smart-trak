const { masterPool } = require('../../config/db');

// Always reads/writes the MASTER database explicitly (never the ambient
// tenant-context-routed `query()` from config/db) — same reasoning as
// schools.service.js: every tenant DB carries its own empty mirror copy of
// this table from the shared migrations, and this setting is platform-wide,
// not per-school.

async function get() {
  const { rows } = await masterPool.query(
    'SELECT default_timezone, updated_at FROM platform_settings WHERE id = 1'
  );
  return rows[0] || { default_timezone: 'Asia/Kolkata', updated_at: null };
}

async function update(data) {
  const { rows } = await masterPool.query(
    `UPDATE platform_settings SET default_timezone = $1, updated_at = now()
     WHERE id = 1 RETURNING default_timezone, updated_at`,
    [data.default_timezone]
  );
  return rows[0];
}

/** The single source of truth every "Asia/Kolkata" fallback across the
 * backend (tripAutoClose, attendance/reports/trips date-bucketing) should
 * read from instead of a hardcoded literal. schools.timezone is NOT NULL so
 * this rarely matters for a real school, but a school-less context or a
 * legacy row still needs *some* default, and a super admin should be able
 * to change it without a code deploy. */
async function getDefaultTimezone() {
  const settings = await get();
  return settings.default_timezone || 'Asia/Kolkata';
}

module.exports = { get, update, getDefaultTimezone };
