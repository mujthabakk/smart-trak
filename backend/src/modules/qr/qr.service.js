const { query } = require('../../config/db');
const ApiError = require('../../utils/ApiError');

/**
 * Resolves a scanned QR code against the three entities that generate one
 * (students.student_qr_code, buses.safety_qr_code, routes.route_qr_code —
 * each column is UNIQUE, so at most one of the three lookups can match).
 * Tenant-scoped: a non-super_admin caller only resolves codes from their own
 * school, so a mismatched school looks identical to an unknown code (404).
 */
async function resolve(code, schoolId) {
  const studentWhere = schoolId ? 'student_qr_code = $1 AND school_id = $2' : 'student_qr_code = $1';
  const studentParams = schoolId ? [code, schoolId] : [code];
  const { rows: studentRows } = await query(
    `SELECT id, school_id, name, class, division, roll_number, pickup_stop_id, drop_stop_id
     FROM students WHERE ${studentWhere}`,
    studentParams
  );
  if (studentRows[0]) return { type: 'student', entity: studentRows[0] };

  const busWhere = schoolId ? 'safety_qr_code = $1 AND school_id = $2' : 'safety_qr_code = $1';
  const busParams = schoolId ? [code, schoolId] : [code];
  const { rows: busRows } = await query(
    `SELECT id, school_id, bus_number, driver_id, current_trip_id, status
     FROM buses WHERE ${busWhere}`,
    busParams
  );
  if (busRows[0]) return { type: 'bus', entity: busRows[0] };

  const routeWhere = schoolId ? 'route_qr_code = $1 AND school_id = $2' : 'route_qr_code = $1';
  const routeParams = schoolId ? [code, schoolId] : [code];
  const { rows: routeRows } = await query(
    `SELECT id, school_id, name, type, bus_id, driver_id
     FROM routes WHERE ${routeWhere}`,
    routeParams
  );
  if (routeRows[0]) return { type: 'route', entity: routeRows[0] };

  throw ApiError.notFound('No student, bus, or route matches this QR code');
}

module.exports = { resolve };
