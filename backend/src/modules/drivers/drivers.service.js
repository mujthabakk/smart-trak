const { query, withTransaction } = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');
const usersService = require('../users/users.service');
const { emailUserCredentials } = require('../../utils/userCredentialsEmail');
const { generateTempPassword } = require('../../utils/tempPassword');
const crypto = require('crypto');

const BASE_SELECT = `
  SELECT d.*, b.bus_number AS assigned_bus_number
  FROM drivers d
  LEFT JOIN buses b ON b.id = d.assigned_bus_id
`;

function toResponse(row) {
  return {
    id: row.id,
    school_id: row.school_id,
    user_id: row.user_id || undefined,
    name: row.name,
    employee_id: row.employee_id,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp || undefined,
    license_number: row.license_number,
    license_expiry: row.license_expiry,
    photo_url: row.photo_url || undefined,
    address: row.address || undefined,
    assigned_bus_id: row.assigned_bus_id || undefined,
    assigned_bus_number: row.assigned_bus_number || undefined,
    is_active: row.is_active,
    is_guest: row.is_guest,
    ...(row.is_guest && {
      guest_validity_type: row.guest_validity_type || undefined,
      guest_expires_at: row.guest_expires_at || undefined,
      guest_max_trips: row.guest_max_trips ?? undefined,
      guest_trips_used: row.guest_trips_used,
    }),
    created_at: row.created_at,
  };
}

async function list(schoolId, { page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`d.school_id = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(d.name ILIKE $${params.length} OR d.employee_id ILIKE $${params.length})`);
  }
  if (filters.is_active !== undefined) {
    params.push(filters.is_active === 'true');
    conditions.push(`d.is_active = $${params.length}`);
  }
  if (filters.is_guest !== undefined) {
    params.push(filters.is_guest === 'true');
    conditions.push(`d.is_guest = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM drivers d ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await query(
    `${BASE_SELECT} ${where} ORDER BY d.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { drivers: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'WHERE d.id = $1 AND d.school_id = $2' : 'WHERE d.id = $1';
  const { rows } = await query(`${BASE_SELECT} ${where}`, params);
  if (!rows[0]) throw ApiError.notFound('Driver not found');
  return toResponse(rows[0]);
}

/**
 * Keeps drivers.assigned_bus_id and buses.driver_id in sync — they're a bidirectional
 * FK pair (see the 001_init.sql comment on circular refs between buses/drivers).
 * `previousBusId` is the driver's assignment before this write; `newBusId` is what it
 * should become (null/undefined un-assigns).
 */
async function syncBusAssignment(client, driverId, schoolId, newBusId, previousBusId) {
  if ((newBusId || null) === (previousBusId || null)) return;

  if (previousBusId) {
    // Only clear the old bus's driver_id if it still points at this driver.
    await client.query('UPDATE buses SET driver_id = NULL WHERE id = $1 AND driver_id = $2', [
      previousBusId,
      driverId,
    ]);
  }

  if (newBusId) {
    const busParams = schoolId ? [newBusId, schoolId] : [newBusId];
    const busWhere = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
    const { rows } = await client.query(`SELECT id FROM buses WHERE ${busWhere}`, busParams);
    if (!rows[0]) throw ApiError.badRequest('Assigned bus not found');

    // A bus can only have one driver — detach whichever other driver currently
    // claims it before pointing it at this one.
    await client.query('UPDATE drivers SET assigned_bus_id = NULL WHERE assigned_bus_id = $1 AND id <> $2', [
      newBusId,
      driverId,
    ]);
    await client.query('UPDATE buses SET driver_id = $1 WHERE id = $2', [driverId, newBusId]);
  }
}

async function create(schoolId, data) {
  if (!schoolId) throw ApiError.badRequest('school_id is required');
  const id = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO drivers (school_id, user_id, name, employee_id, email, phone, whatsapp,
         license_number, license_expiry, photo_url, address, assigned_bus_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,true))
       RETURNING id`,
      [
        schoolId, data.user_id || null, data.name, data.employee_id, data.email, data.phone,
        data.whatsapp || null, data.license_number, data.license_expiry, data.photo_url || null,
        data.address || null, data.assigned_bus_id || null, data.is_active,
      ]
    );
    const driverId = rows[0].id;
    if (data.assigned_bus_id) {
      await syncBusAssignment(client, driverId, schoolId, data.assigned_bus_id, null);
    }
    return driverId;
  });
  return getById(id, schoolId);
}

/**
 * Creates a driver that can log in and use every real driver endpoint
 * (start a trip, mark attendance, end a trip) exactly like a normal driver,
 * but expires after a number of days or a number of trips started —
 * enforced at login (auth.service.js) and again at trip-start
 * (trips.service.js) as defense in depth. No bus/route/student assignment
 * step, same as normal driver creation never required one either.
 */
async function createGuestDriver(actorRole, schoolId, data) {
  if (!schoolId) throw ApiError.badRequest('school_id is required');

  const tempPassword = generateTempPassword();
  const user = await usersService.create(actorRole, schoolId, {
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: tempPassword,
    role: 'driver',
  });

  // Not something the admin should have to type for a temp hire — just
  // needs to be unique per school, same as a real employee_id.
  const employeeId = `GUEST-${crypto.randomBytes(4).toString('hex')}`;
  const guestExpiresAt = data.guest_validity_type === 'days'
    ? new Date(Date.now() + data.guest_validity_value * 24 * 60 * 60 * 1000)
    : null;
  const guestMaxTrips = data.guest_validity_type === 'trips' ? data.guest_validity_value : null;

  const { rows } = await query(
    `INSERT INTO drivers (school_id, user_id, name, employee_id, email, phone,
       license_number, license_expiry, is_active, is_guest, guest_validity_type,
       guest_expires_at, guest_max_trips)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,true,$9,$10,$11)
     RETURNING id`,
    [
      schoolId, user.id, data.name, employeeId, data.email, data.phone,
      data.license_number, data.license_expiry, data.guest_validity_type,
      guestExpiresAt, guestMaxTrips,
    ]
  );
  const driverId = rows[0].id;

  // Fire-and-forget, same non-blocking pattern users.service.js already
  // uses for credential emails — never lets a down/misconfigured SMTP
  // server fail the actual account creation.
  emailUserCredentials(
    { id: user.id, name: user.name, email: user.email, school_id: schoolId },
    tempPassword,
    { triggerType: 'guest_driver_credentials' }
  ).catch((err) => console.error('Failed to email guest driver credentials', err));

  const driver = await getById(driverId, schoolId);
  // The plaintext password is returned exactly once, here — only its
  // bcrypt hash is ever persisted, so this is the admin's one chance to
  // see/relay it (the email above is the other copy).
  return { driver, credentials: { email: user.email, password: tempPassword } };
}

async function update(id, schoolId, data) {
  const existing = await getById(id, schoolId);
  const driverId = await withTransaction(async (client) => {
    const fields = [
      'user_id', 'name', 'employee_id', 'email', 'phone', 'whatsapp', 'license_number',
      'license_expiry', 'photo_url', 'address', 'is_active',
      // Editing a guest driver's own validity after creation (extend/shorten
      // access, or reset their trip count) — no-ops for a non-guest driver
      // since these columns just sit unused.
      'guest_validity_type', 'guest_max_trips', 'guest_expires_at', 'guest_trips_used',
    ];
    const sets = [];
    const params = [];
    for (const field of fields) {
      if (data[field] !== undefined) {
        params.push(data[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }
    if (data.assigned_bus_id !== undefined) {
      params.push(data.assigned_bus_id);
      sets.push(`assigned_bus_id = $${params.length}`);
    }

    if (sets.length) {
      sets.push('updated_at = now()');
      params.push(id);
      await client.query(`UPDATE drivers SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    }

    if (data.assigned_bus_id !== undefined) {
      await syncBusAssignment(client, id, schoolId, data.assigned_bus_id || null, existing.assigned_bus_id || null);
    }

    return id;
  });
  return getById(driverId, schoolId);
}

async function remove(id, schoolId) {
  const params = schoolId ? [id, schoolId] : [id];
  const where = schoolId ? 'id = $1 AND school_id = $2' : 'id = $1';
  const { rowCount } = await query(`DELETE FROM drivers WHERE ${where}`, params);
  if (!rowCount) throw ApiError.notFound('Driver not found');
}

/** Resolves the drivers.id row linked to a logged-in driver's user account, if any.
 * Used to default a driver-role caller's queries to "my own records only". */
async function getIdByUserId(userId, schoolId) {
  const params = schoolId ? [userId, schoolId] : [userId];
  const where = schoolId ? 'user_id = $1 AND school_id = $2' : 'user_id = $1';
  const { rows } = await query(`SELECT id FROM drivers WHERE ${where}`, params);
  return rows[0]?.id || null;
}

/** Drivers whose license expires within the next `days` days (for DocumentExpiry.tsx). */
async function expiringDocuments(schoolId, days) {
  const conditions = ['d.license_expiry >= CURRENT_DATE', 'd.license_expiry <= (CURRENT_DATE + $1::int)'];
  const params = [days];
  if (schoolId) {
    params.push(schoolId);
    conditions.push(`d.school_id = $${params.length}`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const { rows } = await query(`${BASE_SELECT} ${where} ORDER BY d.license_expiry ASC`, params);
  return rows.map(toResponse);
}

async function getRouteStudents(driverUserId, schoolId) {
  // Find driver
  const driverId = await getIdByUserId(driverUserId, schoolId);
  if (!driverId) throw ApiError.badRequest('Driver profile not found');

  // Find active trip
  const { rows: trips } = await query(
    `SELECT id, route_id FROM trips WHERE driver_id = $1 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1`,
    [driverId]
  );

  // If no active trip, driver hasn't scanned QR yet
  if (!trips[0]) {
    throw ApiError.badRequest('scan route qr and safety qr');
  }

  const routeId = trips[0].route_id;
  const tripId = trips[0].id;

  // Fetch route info
  const { rows: routeRows } = await query('SELECT * FROM routes WHERE id = $1', [routeId]);
  
  // Fetch students whose pickup or drop stop belongs to this route
  const { rows: students } = await query(`
    SELECT s.id, s.name, s.class, s.division, 
           COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id) AS pickup_stop_id, 
           COALESCE(tso.override_drop_stop_id, s.drop_stop_id) AS drop_stop_id,
           ps.name as pickup_stop_name, ds.name as drop_stop_name
    FROM students s
    LEFT JOIN trip_student_overrides tso ON tso.student_id = s.id AND tso.trip_id = $1
    LEFT JOIN stops ps ON ps.id = COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id)
    LEFT JOIN stops ds ON ds.id = COALESCE(tso.override_drop_stop_id, s.drop_stop_id)
    WHERE (COALESCE(tso.override_pickup_stop_id, s.pickup_stop_id) IN (SELECT id FROM stops WHERE route_id = $2)
        OR COALESCE(tso.override_drop_stop_id, s.drop_stop_id) IN (SELECT id FROM stops WHERE route_id = $2))
      AND s.is_active = true
    ORDER BY s.name ASC
  `, [tripId, routeId]);

  return {
    route: routeRows[0],
    students,
  };
}

module.exports = { list, getById, create, createGuestDriver, update, remove, expiringDocuments, getIdByUserId, getRouteStudents };
