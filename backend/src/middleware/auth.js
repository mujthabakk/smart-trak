const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

/**
 * Verifies the Bearer JWT and attaches { id, role, school_id } to req.user.
 * The token payload is intentionally minimal — controllers that need the
 * full user record should look it up by id.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

/** Restricts a route to one or more roles. Use after requireAuth. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

/**
 * Resolves the school_id a request is scoped to.
 * super_admin may pass ?school_id= to act on a specific tenant (or omit it
 * for cross-tenant views); every other role is pinned to their own school.
 */
function resolveSchoolId(req) {
  if (req.user.role === 'super_admin') {
    return req.query.school_id || req.body.school_id || null;
  }
  if (!req.user.school_id) {
    throw ApiError.forbidden('Account is not associated with a school');
  }
  return req.user.school_id;
}

module.exports = { requireAuth, requireRole, resolveSchoolId };
