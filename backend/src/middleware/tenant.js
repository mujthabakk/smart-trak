const { tenantContext, getTenantPool, masterPool } = require('../config/db');
const { verifyToken } = require('../utils/jwt');

async function tenantMiddleware(req, res, next) {
  let schoolId = null;

  // 1. Try to get school_id from Authorization header — except on /auth/login
  // itself, where a leftover token from an earlier (possibly now-invalid,
  // different-school) session must never be allowed to override the
  // school_id the caller is actively trying to log into. A client that
  // blindly attaches a stored token to every request (including login)
  // would otherwise get a confusing "Invalid school_id" no matter what
  // they send in the body, since this branch runs before body is checked.
  const header = req.headers.authorization || '';
  if (req.path !== '/auth/login' && header.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(header.split(' ')[1]);
      schoolId = payload.school_id;
    } catch {
      // Ignore invalid token here; requireAuth will catch it later if it's a protected route
    }
  }

  // 2. Try to get school_id from body (for /auth/login)
  if (!schoolId && req.body && req.body.school_id) {
    schoolId = req.body.school_id;
  }

  // If no school_id is provided, proceed with the Master DB context
  if (!schoolId) {
    return tenantContext.run({ pool: masterPool }, next);
  }

  try {
    // Get the school from the Master DB to ensure it exists
    const { rows } = await masterPool.query('SELECT id FROM schools WHERE id = $1', [schoolId]);
    if (!rows[0]) {
      return res.status(400).json({ error: 'Invalid school_id' });
    }

    // Derive the tenant database name (e.g., SCH-001 -> smarttrack_sch_001)
    const dbName = `smarttrack_${schoolId.replace('-', '_').toLowerCase()}`;
    const pool = getTenantPool(dbName);

    // Run the rest of the request within the tenant context
    tenantContext.run({ pool }, next);
  } catch (err) {
    console.error('Tenant middleware error:', err);
    res.status(500).json({ error: 'Failed to resolve tenant database' });
  }
}

module.exports = tenantMiddleware;
