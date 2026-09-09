const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { masterPool, getTenantPool, closeTenantPool } = require('../../config/db');
const { runMigrationsOnPool } = require('../../db/migrate');
const { signToken } = require('../../utils/jwt');
const { generateTempPassword } = require('../../utils/tempPassword');
const { emailUserCredentials } = require('../../utils/userCredentialsEmail');
const { emailNewSchoolApplication } = require('../../utils/schoolApplicationEmail');
const ApiError = require('../../utils/ApiError');
const { parsePagination, paginationMeta } = require('../../utils/pagination');

// schools.* always reads/writes the MASTER database explicitly (never the
// ambient tenant-context-routed `query()` from config/db) — every tenant DB
// also carries its own local copy of its own school row (seeded once at
// creation, purely to satisfy local FKs like buses.school_id), so relying on
// ambient context here would silently update/read whichever copy happens to
// match the caller's role: master for a super_admin request, the tenant
// mirror for a school_admin one. Master is the single source of truth; see
// syncTenantMirror below for how the mirror is kept from going stale.

const BASE_SELECT = `
  SELECT sc.*, p.name AS plan_name
  FROM schools sc
  JOIN plans p ON p.id = sc.plan_id
`;

/**
 * student/driver/bus/route rows live only in each school's own tenant DB,
 * never in master (BASE_SELECT above reads master) — counting them via a
 * subquery against sc.id, as this used to do, always returned 0 regardless
 * of real data. Enrich each master row with a best-effort per-tenant count
 * query instead, same fan-out-per-school pattern emailLogs.service.js and
 * auditLogs.service.js use. A school with no tenant DB yet (never
 * provisioned, or momentarily unreachable) degrades to zero counts rather
 * than failing the whole list.
 */
async function attachCounts(row) {
  try {
    const pool = getTenantPool(`smarttrack_${row.id.replace('-', '_').toLowerCase()}`);
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM students WHERE school_id = $1)::int AS student_count,
        (SELECT COUNT(*) FROM drivers WHERE school_id = $1)::int AS driver_count,
        (SELECT COUNT(*) FROM buses WHERE school_id = $1)::int AS bus_count,
        (SELECT COUNT(*) FROM routes WHERE school_id = $1)::int AS route_count
    `, [row.id]);
    Object.assign(row, rows[0]);
  } catch (err) {
    console.error(`Failed to read counts for school ${row.id}:`, err.message);
    row.student_count = row.driver_count = row.bus_count = row.route_count = 0;
  }
  return row;
}

function toResponse(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    post_code: row.post_code || undefined,
    country: row.country || undefined,
    phone: row.phone,
    email: row.email,
    website: row.website || undefined,
    plan_id: row.plan_id,
    plan_name: row.plan_name,
    status: row.status,
    subdomain: row.subdomain,
    student_count: row.student_count,
    driver_count: row.driver_count,
    bus_count: row.bus_count,
    route_count: row.route_count,
    admin_name: row.admin_name || undefined,
    admin_email: row.admin_email || undefined,
    created_at: row.created_at,
    logo_url: row.logo_url || undefined,
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
    supervisor_name: row.supervisor_name || undefined,
    supervisor_phone: row.supervisor_phone || undefined,
    timezone: row.timezone,
  };
}

async function list({ page, pageSize, offset }, filters) {
  const conditions = [];
  const params = [];
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(sc.name ILIKE $${params.length} OR sc.email ILIKE $${params.length})`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`sc.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await masterPool.query(`SELECT COUNT(*)::int AS total FROM schools sc ${where}`, params);
  const total = countRows[0].total;

  params.push(pageSize, offset);
  const { rows } = await masterPool.query(
    `${BASE_SELECT} ${where} ORDER BY sc.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  await Promise.all(rows.map(attachCounts));

  return { schools: rows.map(toResponse), pagination: paginationMeta(page, pageSize, total) };
}

async function getById(id) {
  const { rows } = await masterPool.query(`${BASE_SELECT} WHERE sc.id = $1`, [id]);
  if (!rows[0]) throw ApiError.notFound('School not found');
  await attachCounts(rows[0]);
  return toResponse(rows[0]);
}

/** Keeps a tenant DB's own local schools-row mirror (needed only so
 * buses.school_id/users.school_id FKs resolve locally) from drifting away
 * from the master record. Best-effort: a school with no tenant DB yet, or a
 * momentarily-unreachable one, shouldn't block the authoritative master write. */
async function syncTenantMirror(id, sets, params) {
  try {
    const tenantPool = getTenantPool(`smarttrack_${id.replace('-', '_').toLowerCase()}`);
    await tenantPool.query(`UPDATE schools SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  } catch (err) {
    console.error(`Warning: failed to sync school ${id} into its tenant DB mirror:`, err.message);
  }
}

/** Whether a school code is already taken — used both for the live "is this
 * code available" check on the Add School form and as a pre-flight check
 * inside create() itself, so a collision surfaces as a specific, actionable
 * message instead of a generic "record already exists" from the raw
 * Postgres unique-violation. */
async function codeExists(code) {
  const { rows } = await masterPool.query('SELECT 1 FROM schools WHERE id = $1', [code.toUpperCase()]);
  return !!rows[0];
}

async function create(data) {
  if (await codeExists(data.school_code)) {
    throw ApiError.conflict(`School code "${data.school_code.toUpperCase()}" is already in use — choose a different one.`);
  }

  const { rows } = await masterPool.query(
    `INSERT INTO schools (id, name, address, city, state, post_code, country, phone, email, website,
       plan_id, subdomain, admin_name, admin_email, logo_url, status, latitude, longitude,
       supervisor_name, supervisor_phone, timezone)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,COALESCE($16,'pending'),$17,$18,$19,$20,COALESCE($21,'Asia/Kolkata'))
     RETURNING *`,
    [
      data.school_code, data.name, data.address, data.city, data.state, data.post_code, data.country,
      data.phone, data.email, data.website, data.plan_id, data.subdomain,
      data.admin_name, data.admin_email, data.logo_url, data.status,
      data.latitude, data.longitude,
      data.supervisor_name, data.supervisor_phone, data.timezone,
    ]
  );
  const school = rows[0];

  // Tenant DB creation is deferred until the school is actually active — a
  // school created straight to 'active' (skipping the usual pending-review
  // step) gets provisioned right away; the default 'pending' path (every
  // public application) waits for the approval transition in update()
  // instead. Without this, a rejected/abandoned application would still
  // leave a whole Postgres database behind it forever, since remove() never
  // drops a tenant DB that was never meant to exist in the first place.
  if (school.status === 'active') {
    await provisionTenant(school);
  }

  return getById(school.id);
}

/**
 * Full tenant provisioning for a school that is now active: creates its
 * database, runs migrations, mirrors the plan + school rows into it (so
 * buses.school_id/users.school_id etc. have a local row to FK against),
 * and creates/emails the school_admin login. Safe to call more than once
 * for the same school — CREATE DATABASE, the migrations runner, and every
 * mirror insert below are all idempotent (ON CONFLICT upserts, or a
 * swallowed "already exists" warning) — since a school re-activated after
 * being suspended already has all of this from its first approval.
 * Called by create() (a school made 'active' immediately) and by update()
 * (the pending/suspended -> active approval transition).
 */
async function provisionTenant(school) {
  const schoolId = school.id;
  const dbName = `smarttrack_${schoolId.replace('-', '_').toLowerCase()}`;

  // 1. Create the database
  try {
    await masterPool.query(`CREATE DATABASE "${dbName}"`);
  } catch (err) {
    console.error(`Warning: Failed to create database ${dbName} (might already exist):`, err.message);
  }

  // 2. Run migrations on the new database
  const tenantPool = getTenantPool(dbName);
  try {
    await runMigrationsOnPool(tenantPool, dbName);
  } catch (err) {
    console.error(`Failed to run migrations for school ${dbName}:`, err);
    throw ApiError.badRequest(`School approved, but database provisioning failed: ${err.message}`);
  }

  // 3. Mirror the plan + school row into the tenant DB — buses.school_id,
  // users.school_id etc. all carry a local FK to this DB's own schools row,
  // so those inserts would fail without it.
  // Both upsert on id (ON CONFLICT), not plain-insert: deleting a school only
  // ever removes its master row — its tenant DB (and any plan/school rows
  // already mirrored into it from a previous creation reusing this code or
  // this plan) is never dropped, see remove() below. A plain INSERT would
  // throw on that leftover row, get swallowed by the catch here, and then
  // silently skip mirroring the school — which cascades into a broken FK for
  // step 4's admin-user insert below (and thus no credentials email either).
  try {
    const { rows: planRows } = await masterPool.query('SELECT * FROM plans WHERE id = $1', [school.plan_id]);
    const p = planRows[0];
    if (p) {
      await tenantPool.query(
        `INSERT INTO plans (id, name, label, price_monthly, price_annual, price_per_student, billing_cycle, max_students, max_buses, max_drivers, features, is_popular)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, label = EXCLUDED.label, price_monthly = EXCLUDED.price_monthly,
           price_annual = EXCLUDED.price_annual, price_per_student = EXCLUDED.price_per_student,
           billing_cycle = EXCLUDED.billing_cycle, max_students = EXCLUDED.max_students,
           max_buses = EXCLUDED.max_buses, max_drivers = EXCLUDED.max_drivers,
           features = EXCLUDED.features, is_popular = EXCLUDED.is_popular`,
        [p.id, p.name, p.label, p.price_monthly, p.price_annual, p.price_per_student, p.billing_cycle, p.max_students, p.max_buses, p.max_drivers, JSON.stringify(p.features), p.is_popular]
      );
    }
    await tenantPool.query(
      `INSERT INTO schools (id, name, address, city, state, post_code, country, phone, email, website,
         plan_id, subdomain, admin_name, admin_email, logo_url, status, latitude, longitude,
         supervisor_name, supervisor_phone, timezone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city, state = EXCLUDED.state,
         post_code = EXCLUDED.post_code, country = EXCLUDED.country, phone = EXCLUDED.phone,
         email = EXCLUDED.email, website = EXCLUDED.website, plan_id = EXCLUDED.plan_id,
         subdomain = EXCLUDED.subdomain, admin_name = EXCLUDED.admin_name, admin_email = EXCLUDED.admin_email,
         logo_url = EXCLUDED.logo_url, status = EXCLUDED.status, latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude, supervisor_name = EXCLUDED.supervisor_name,
         supervisor_phone = EXCLUDED.supervisor_phone, timezone = EXCLUDED.timezone`,
      [
        school.id, school.name, school.address, school.city, school.state, school.post_code, school.country,
        school.phone, school.email, school.website, school.plan_id, school.subdomain,
        school.admin_name, school.admin_email, school.logo_url, school.status,
        school.latitude, school.longitude,
        school.supervisor_name, school.supervisor_phone, school.timezone,
      ]
    );
  } catch (err) {
    console.error(`Warning: failed to mirror school ${schoolId} into its tenant DB:`, err.message);
  }

  // 4. school_admin credentials — see provisionAdminAccount's own docstring.
  await provisionAdminAccount(school, tenantPool);
}

/**
 * Creates (or resets) the school_admin login for a now-active school and
 * emails the credentials — inserted straight into the tenant pool (not the
 * ambient `query()`), since the caller here is always a super_admin's own
 * request, which carries no school_id in its JWT, so ambient context would
 * be master, not this school's tenant DB.
 * ON CONFLICT upserts rather than plain-inserting: deleting a school only
 * ever removes its master row (its tenant DB is never dropped — see
 * remove() below), so re-creating a school with the same code and admin
 * email would otherwise hit that leftover tenant row's UNIQUE(email) and
 * silently fail to send a new email at all.
 */
async function provisionAdminAccount(school, tenantPool) {
  if (!school.admin_email) return;
  try {
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const adminName = school.admin_name || `${school.name} Admin`;
    const adminEmail = school.admin_email.trim().toLowerCase();
    const { rows: adminRows } = await tenantPool.query(
      `INSERT INTO users (name, email, password_hash, role, school_id)
       VALUES ($1,$2,$3,'school_admin',$4)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
             role = 'school_admin', school_id = EXCLUDED.school_id
       RETURNING id, name, email`,
      [adminName, adminEmail, passwordHash, school.id]
    );
    const admin = adminRows[0];
    await emailUserCredentials(
      { id: admin.id, name: admin.name, email: admin.email, school_id: school.id },
      tempPassword,
      { triggerType: 'school_approval', pool: tenantPool }
    );
  } catch (err) {
    console.error(`Warning: failed to create/email school_admin login for ${school.id}:`, err.message);
  }
}

async function update(id, data) {
  const existing = await getById(id);
  const fields = [
    'name', 'address', 'city', 'state', 'post_code', 'country', 'phone', 'email', 'website',
    'plan_id', 'subdomain', 'admin_name', 'admin_email', 'logo_url', 'status', 'latitude', 'longitude',
    'supervisor_name', 'supervisor_phone', 'timezone',
  ];
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
  await masterPool.query(`UPDATE schools SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  await syncTenantMirror(id, sets, params);
  const updated = await getById(id);

  // The approval moment (pending/suspended -> active) is when the tenant
  // database actually gets created — see provisionTenant's docstring. A
  // school re-approved from 'suspended' already has a DB from its first
  // approval; provisionTenant is idempotent so calling it again is safe.
  if (data.status === 'active' && existing.status !== 'active') {
    await provisionTenant(updated);
  }

  return updated;
}

/**
 * Deletes a school and its entire tenant database. The master row is the
 * source of truth, so it's removed first; dropping the tenant DB is
 * best-effort afterward (a failure there leaves an orphaned tenant DB rather
 * than blocking the delete the admin actually asked for and was warned is
 * permanent). Without this, re-creating a school with the same code/email/
 * subdomain later would silently collide with leftover tenant-DB rows.
 */
async function remove(id) {
  const { rowCount } = await masterPool.query('DELETE FROM schools WHERE id = $1', [id]);
  if (!rowCount) throw ApiError.notFound('School not found');

  const dbName = `smarttrack_${id.replace('-', '_').toLowerCase()}`;
  try {
    await closeTenantPool(dbName);
    await masterPool.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [dbName]
    );
    await masterPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  } catch (err) {
    console.error(`Warning: failed to drop tenant database ${dbName} for deleted school ${id}:`, err.message);
  }
}

/**
 * Issues a school_admin-scoped JWT for a super_admin to "log in as" a
 * school's admin — same mechanism a real login would produce, so every
 * subsequent request (including tenant routing in middleware/tenant.js)
 * behaves exactly as if that admin had signed in themselves.
 */
async function impersonateAdmin(id) {
  const school = await getById(id);
  const dbName = `smarttrack_${id.replace('-', '_').toLowerCase()}`;
  const tenantPool = getTenantPool(dbName);

  let admin;
  try {
    const { rows } = await tenantPool.query(
      `SELECT id, name, email, phone, avatar, created_at, last_login
       FROM users WHERE school_id = $1 AND role = 'school_admin'
       ORDER BY created_at ASC LIMIT 1`,
      [id]
    );
    admin = rows[0];
  } catch (err) {
    console.error(`Failed to query tenant DB ${dbName} for impersonation:`, err.message);
    throw ApiError.badRequest("This school's database isn't provisioned yet");
  }
  if (!admin) throw ApiError.notFound('This school has no admin account to log in as');

  const user = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone || undefined,
    role: 'school_admin',
    school_id: id,
    school_name: school.name,
    plan_type: school.plan_name,
    plan_label: school.plan_name,
    avatar: admin.avatar || undefined,
    created_at: admin.created_at,
    last_login: admin.last_login || undefined,
  };
  const token = signToken({ id: admin.id, role: 'school_admin', school_id: id });
  return { user, token };
}

function slugifyName(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'school';
}

/**
 * Emails every super_admin and drops each of them an in-app notification
 * the moment a new school applies — previously apply() gave no signal at
 * all that a 'pending' school needed review. Written directly to the
 * master DB (not via notifications.service.js's createNotification, which
 * routes through the ambient tenant-context query() — schools.service.js
 * always talks to master explicitly, see the module-level note above) and
 * entirely best-effort: a failure here must never fail the applicant's
 * own signup, which has already succeeded by the time this runs.
 */
async function notifySuperAdminsOfApplication(school, data) {
  try {
    await emailNewSchoolApplication(school, data);
  } catch (err) {
    console.error('Failed to email super_admins about new school application:', err.message);
  }
  try {
    const { rows: admins } = await masterPool.query("SELECT id FROM users WHERE role = 'super_admin'");
    await Promise.all(admins.map((admin) =>
      masterPool.query(
        `INSERT INTO notifications (school_id, user_id, title, body, type, action_url)
         VALUES ($1,$2,$3,$4,'info',$5)`,
        [school.id, admin.id, 'New school application', `${school.name} applied and is awaiting approval.`, '/super-admin/schools']
      )
    ));
  } catch (err) {
    console.error('Failed to create in-app notifications for new school application:', err.message);
  }
}

/**
 * Public self-service signup (POST /schools/apply, no auth) — the "Onboard
 * your school" marketing-site flow. The applicant picks their own
 * school_code (live-checked client-side via GET /schools/check-code, same
 * as the super_admin Add School form); create() re-checks it server-side
 * and throws a clear conflict if it was taken in the meantime. subdomain
 * and plan_id still have no applicant-facing field, so those are derived
 * here: a URL-safe slug of the school name plus a random suffix for the
 * subdomain, and plan_id resolved from the plan's display name (the
 * marketing site's plan ids — 'basic'/'standard'/'premium' — match
 * plans.name, not the real plans.id like 'plan_standard').
 * Always forced to status 'pending' — never provisions admin credentials
 * immediately; those go out only when a super_admin later approves it (see
 * update()'s pending -> active transition), matching what this page tells
 * applicants: credentials arrive "on approval".
 */
async function apply(data) {
  const { rows: planRows } = await masterPool.query('SELECT id FROM plans WHERE lower(name) = lower($1)', [data.plan_name]);
  const plan = planRows[0];
  if (!plan) throw ApiError.badRequest('Unknown plan selected');

  const slug = slugifyName(data.school_name);
  const suffix = crypto.randomBytes(3).toString('hex');

  const school = await create({
    // Already uppercased/validated by schools.validation.js's applySchool
    // .school_code transform — this becomes the school's login code, and
    // Login.tsx always uppercases what a school_admin types.
    school_code: data.school_code,
    name: data.school_name,
    address: data.address || 'Not provided',
    city: data.city || 'Not provided',
    state: data.state || data.city || 'Not provided',
    post_code: data.post_code,
    country: data.country,
    phone: data.phone,
    email: data.email,
    website: data.website,
    plan_id: plan.id,
    subdomain: `${slug}-${suffix}`,
    admin_name: data.admin_name,
    admin_email: data.email,
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    status: 'pending',
  });

  await notifySuperAdminsOfApplication(school, data);
  return school;
}

module.exports = { list, getById, create, update, remove, impersonateAdmin, apply, codeExists };
