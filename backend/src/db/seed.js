/**
 * Seeds enough data to log in with the same demo credentials the frontend's
 * old fake-auth flow used (src/lib/demoAccounts.ts), so switching to the real
 * API is a drop-in swap. Safe to re-run: wipes seeded tables first.
 */
const bcrypt = require('bcryptjs');
const { masterPool, getTenantPool } = require('../config/db');
const { runMigrationsOnPool } = require('./migrate');
const { generateQrCode, generateSeedQrCode } = require('../utils/qrcode');

const DEMO_ACCOUNTS = [
  { role: 'super_admin', email: 'superadmin@smarttrack.ae', password: 'Super@123', name: 'Khalid Al Maktoum', phone: '+971 50 100 1000' },
  { role: 'school_admin', email: 'admin@greenfield.ae', password: 'School@123', name: 'Hassan Ahmed', school_id: 'GREENFIELD', phone: '+971 50 200 2000' },
  { role: 'school_admin', email: 'admin@alnoor.ae', password: 'School@123', name: 'Fatima Al Ali', school_id: 'ALNOOR', phone: '+971 50 300 3000' },
  { role: 'driver', email: 'driver@smarttrack.ae', password: 'Driver@123', name: 'Salim Ahmed Rashid', school_id: 'GREENFIELD', phone: '+971 50 400 4000' },
  { role: 'guest_driver', email: 'guest@smarttrack.ae', password: 'Guest@123', name: 'Omar Yusuf', school_id: 'GREENFIELD', phone: '+971 50 500 5000' },
  { role: 'parent', email: 'parent@smarttrack.ae', password: 'Parent@123', name: 'Aisha Mohammed', school_id: 'GREENFIELD', phone: '+971 50 600 6000' },
];

async function dropAllDatabases() {
  try {
    const { rows: tableCheck } = await masterPool.query(`SELECT to_regclass('public.schools') as exists;`);
    if (!tableCheck[0].exists) return;
    
    const { rows } = await masterPool.query('SELECT id FROM schools');
    for (const school of rows) {
      const dbName = `smarttrack_${school.id.replace('-', '_').toLowerCase()}`;
      try {
        await masterPool.query(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = $1 AND pid <> pg_backend_pid();
        `, [dbName]);
        await masterPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
        console.log(`Dropped database ${dbName}`);
      } catch (err) {
        console.warn(`Failed to drop database ${dbName}:`, err.message);
      }
    }
  } catch (err) {
    console.log('Skipping tenant DB drop (Master DB not ready or no schools).');
  }
}

async function wipeMaster() {
  try {
    // We can just wipe everything and recreate it using runMigrationsOnPool
    await masterPool.query('DROP SCHEMA public CASCADE');
    await masterPool.query('CREATE SCHEMA public');
    console.log('Wiped Master DB schema.');
  } catch (err) {
    console.error('Failed to wipe master schema:', err.message);
  }
}

async function seedPlans() {
  const plans = [
    {
      id: 'plan_basic', name: 'basic', label: 'Basic',
      // Flat per-student pricing, no base fee — price_annual is the primary
      // rate ($/student/year), price_monthly is just that ÷ 12 for display.
      price_monthly: 0.23, price_annual: 2.72,
      max_students: 200, max_buses: 5, max_drivers: 10, is_popular: false,
      // Matches the marketing copy in frontend/src/lib/siteContent.ts PLANS,
      // so the same names are addable/toggleable from the super-admin Plans UI.
      features: [
        { name: 'Real-time GPS tracking', price: 0 },
        { name: 'QR attendance (Safety + Route + Student)', price: 0 },
        { name: 'Push notifications', price: 0 },
        { name: 'Live fleet map', price: 0 },
        { name: 'Basic attendance reports', price: 0 },
        { name: 'Email support', price: 0 },
      ],
    },
    {
      id: 'plan_standard', name: 'standard', label: 'Standard',
      price_monthly: 0.27, price_annual: 3.27,
      max_students: 500, max_buses: 15, max_drivers: 25, is_popular: true,
      features: [
        { name: 'Everything in Basic', price: 0 },
        { name: 'WhatsApp notifications', price: 0 },
        { name: 'Leave management', price: 0 },
        { name: 'Lost & found', price: 0 },
        { name: 'Bus transfer module', price: 0 },
        { name: 'Advanced reports & analytics', price: 0 },
        { name: 'Training centre access', price: 0 },
        { name: 'Priority email support', price: 0 },
      ],
    },
    {
      id: 'plan_premium', name: 'premium', label: 'Premium',
      price_monthly: 0.34, price_annual: 4.08,
      max_students: 99999, max_buses: 99999, max_drivers: 99999, is_popular: false,
      features: [
        { name: 'Everything in Standard', price: 0 },
        { name: 'WhatsApp + SMS notifications', price: 0 },
        { name: 'Guest driver management', price: 0 },
        { name: 'Full analytics & audit logs', price: 0 },
        { name: 'Bulk school & student import', price: 0 },
        { name: 'API access', price: 0 },
        { name: 'Dedicated support & onboarding', price: 0 },
      ],
    },
  ];
  for (const p of plans) {
    await masterPool.query(
      `INSERT INTO plans (id, name, label, price_monthly, price_annual,
         billing_cycle, max_students, max_buses, max_drivers, features, is_popular)
       VALUES ($1,$2,$3,$4,$5,'monthly',$6,$7,$8,$9,$10)`,
      [
        p.id, p.name, p.label, p.price_monthly, p.price_annual,
        p.max_students, p.max_buses, p.max_drivers, JSON.stringify(p.features), p.is_popular,
      ]
    );
  }
}

async function seedSchools() {
  const schools = [
    ['GREENFIELD', 'Greenfield Academy', '45 Sheikh Zayed Road', 'Dubai', 'Dubai', '00000', 'UAE', '+971-4-555-0100', 'admin@greenfield.ae', 'www.greenfield.ae', 'plan_premium', 'active', 'greenfield', 'Hassan Ahmed', 'admin@greenfield.ae'],
    ['ALNOOR', 'Al-Noor International School', '12 Knowledge Village', 'Abu Dhabi', 'Abu Dhabi', '00000', 'UAE', '+971-2-555-0200', 'admin@alnoor.ae', 'www.alnoor.ae', 'plan_standard', 'active', 'alnoor', 'Fatima Al Ali', 'admin@alnoor.ae']
  ];

  for (const s of schools) {
    await masterPool.query(
      `INSERT INTO schools (id, name, address, city, state, post_code, country, phone, email, website, plan_id, status, subdomain, admin_name, admin_email) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      s
    );

    const schoolId = s[0];
    const planId = s[10];
    const dbName = `smarttrack_${schoolId.replace('-', '_').toLowerCase()}`;
    await masterPool.query(`CREATE DATABASE "${dbName}"`);
    const tenantPool = getTenantPool(dbName);
    await runMigrationsOnPool(tenantPool, dbName);

    // Copy the referenced plan
    const { rows: planRows } = await masterPool.query(`SELECT * FROM plans WHERE id = $1`, [planId]);
    const p = planRows[0];
    await tenantPool.query(
      `INSERT INTO plans (id, name, label, price_monthly, price_annual, billing_cycle, max_students, max_buses, max_drivers, features, is_popular)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [p.id, p.name, p.label, p.price_monthly, p.price_annual, p.billing_cycle, p.max_students, p.max_buses, p.max_drivers, JSON.stringify(p.features), p.is_popular]
    );

    // Copy the school to satisfy foreign keys
    await tenantPool.query(
      `INSERT INTO schools (id, name, address, city, state, post_code, country, phone, email, website, plan_id, status, subdomain, admin_name, admin_email) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      s
    );
  }
}

async function seedUsers() {
  const ids = {};
  for (const acc of DEMO_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(acc.password, 10);
    
    let targetPool = masterPool;
    if (acc.role !== 'super_admin') {
      const dbName = `smarttrack_${acc.school_id.replace('-', '_').toLowerCase()}`;
      targetPool = getTenantPool(dbName);
    }
    
    const { rows } = await targetPool.query(
      `INSERT INTO users (name, email, password_hash, phone, role, school_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [acc.name, acc.email, passwordHash, acc.phone, acc.role, acc.school_id || null]
    );
    ids[acc.email] = rows[0].id;
  }
  return ids;
}

async function seedSubscriptions() {
  // amount_paid = student_count × the plan's price_annual (per-student/year
  // rate) — there's no separate base fee to add on top any more.
  await masterPool.query(`
    INSERT INTO subscriptions (school_id, plan_id, start_date, end_date, amount_paid, payment_method, status) VALUES
    ('GREENFIELD', 'plan_premium', '2025-09-01', '2026-08-31', 36.72, 'Bank Transfer', 'active'),
    ('ALNOOR', 'plan_standard', '2025-10-15', '2026-10-14', 1635.00, 'Online', 'active')
  `);
}

async function seedFleetAndRoutes(driverUserId) {
  const tenantPool = getTenantPool('smarttrack_greenfield');
  const client = await tenantPool.connect();
  try {
    await client.query('BEGIN');
    // Buses/routes/drivers have no persisted assignment to each other — a
    // bus, route, and driver are only ever linked together via a `trips` row
    // created live when a driver scans in, so the seed doesn't wire one up.
    await client.query(
      `INSERT INTO drivers (school_id, user_id, name, employee_id, email, phone, whatsapp, license_number, license_expiry)
       VALUES ('GREENFIELD',$1,'Salim Ahmed Rashid','EMP001','driver@smarttrack.ae','+971551234501','+971551234501','DXB-LIC-78901','2027-08-15') RETURNING id`,
      [driverUserId]
    );
    await client.query(
      `INSERT INTO drivers (school_id, name, employee_id, email, phone, whatsapp, license_number, license_expiry)
       VALUES ('GREENFIELD','Ali Mohammed Al-Faris','EMP002','ali.driver@greenfield.ae','+971551234502','+971551234502','DXB-LIC-78902','2026-03-20') RETURNING id`
    );

    await client.query(
      `INSERT INTO buses (school_id, bus_number, seat_capacity, make_model, year, insurance_expiry, fitness_cert_expiry, safety_qr_code, status)
       VALUES ('GREENFIELD','B-001',45,'Toyota Coaster 2022',2022,'2026-12-31','2026-06-30',$1,'idle') RETURNING id`,
      [generateSeedQrCode('BUS', 'GREENFIELD-B-001')]
    );
    await client.query(
      `INSERT INTO buses (school_id, bus_number, seat_capacity, make_model, year, insurance_expiry, fitness_cert_expiry, safety_qr_code, status)
       VALUES ('GREENFIELD','B-002',35,'Mitsubishi Rosa 2021',2021,'2026-08-15','2026-08-15',$1,'idle') RETURNING id`,
      [generateSeedQrCode('BUS', 'GREENFIELD-B-002')]
    );

    const route1 = await client.query(
      `INSERT INTO routes (school_id, name, start_point, end_point, route_qr_code)
       VALUES ('GREENFIELD','Route A','Al Barsha South','Greenfield Academy',$1) RETURNING id`,
      [generateSeedQrCode('RT', 'GREENFIELD-Route-A')]
    );
    const routeId1 = route1.rows[0].id;

    const stop1 = await client.query(
      `INSERT INTO stops (route_id, name, latitude, longitude, order_index, estimated_time)
       VALUES ($1,'Al Barsha South 1',25.1050,55.1893,1,'07:00') RETURNING id`,
      [routeId1]
    );
    const stop2 = await client.query(
      `INSERT INTO stops (route_id, name, latitude, longitude, order_index, estimated_time)
       VALUES ($1,'JLT Cluster T',25.1262,55.2105,2,'07:30') RETURNING id`,
      [routeId1]
    );

    // Ahmed and Layla are siblings (different classes) sharing the demo parent
    // account (parent@smarttrack.ae) so the mobile login-with-multiple-children
    // flow has real data to exercise. The others keep distinct per-student
    // parent emails, unrelated to the demo account.
    const students = [
      ['Ahmed Hassan Al-Rashid', '5', 'A', '501', '2015-03-12', stop1.rows[0].id, 'parent@smarttrack.ae'],
      ['Fatima Noor Al-Zahra', '3', 'B', '302', '2017-07-22', stop2.rows[0].id, null],
      ['Mohammed Khalid Ibrahim', '7', 'A', '701', '2013-11-05', stop1.rows[0].id, null],
      ['Layla Hassan Al-Rashid', '2', 'C', '201', '2019-05-18', stop1.rows[0].id, 'parent@smarttrack.ae'],
    ];
    for (const [name, klass, division, roll, dob, pickupStopId, parentEmail] of students) {
      const { rows } = await client.query(
        `INSERT INTO students (school_id, name, class, division, roll_number, dob, student_qr_code, pickup_stop_id, drop_stop_id)
         VALUES ('GREENFIELD',$1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
        [name, klass, division, roll, dob, generateSeedQrCode('STD', `GREENFIELD-STD-${roll}`), pickupStopId]
      );
      const email = parentEmail || `parent.${rows[0].id}@example.com`;
      const parentName = parentEmail ? 'Aisha Mohammed' : `Parent of ${name}`;
      await client.query(
        `INSERT INTO parent_details (student_id, parent_name, relationship, email, phone, whatsapp)
         VALUES ($1,$2,'Father',$3,$4,$4)`,
        [rows[0].id, parentName, email, '+971501234567']
      );
    }

    const routeC = await client.query(
      `INSERT INTO routes (school_id, name, start_point, end_point, route_qr_code)
       VALUES ('GREENFIELD','Route C','Al Quoz','Greenfield Academy',$1) RETURNING id`,
      [generateSeedQrCode('RT', 'GREENFIELD-Route-C')]
    );
    const routeIdC = routeC.rows[0].id;

    const stopC1 = await client.query(
      `INSERT INTO stops (route_id, name, latitude, longitude, order_index, estimated_time)
       VALUES ($1,'Al Quoz Industrial 3',25.1367,55.2273,1,'07:10') RETURNING id`,
      [routeIdC]
    );
    const stopC2 = await client.query(
      `INSERT INTO stops (route_id, name, latitude, longitude, order_index, estimated_time)
       VALUES ($1,'Motor City',25.0457,55.2371,2,'07:30') RETURNING id`,
      [routeIdC]
    );
    const stopC3 = await client.query(
      `INSERT INTO stops (route_id, name, latitude, longitude, order_index, estimated_time)
       VALUES ($1,'Sports City',25.0424,55.2201,3,'07:50') RETURNING id`,
      [routeIdC]
    );

    const routeCStudents = [
      ['Yousef Abdullah Al-Mansoori', '4', 'A', '401', '2016-02-10', stopC1.rows[0].id, null],
      ['Mariam Saeed Al-Suwaidi', '4', 'B', '402', '2016-06-19', stopC1.rows[0].id, null],
      ['Khalid Omar Al-Farsi', '6', 'A', '601', '2014-09-03', stopC2.rows[0].id, null],
      ['Noura Khalid Al-Farsi', '1', 'A', '101', '2019-12-27', stopC2.rows[0].id, null],
      ['Hamdan Rashid Al-Mazrouei', '8', 'B', '801', '2012-04-14', stopC3.rows[0].id, null],
    ];
    for (const [name, klass, division, roll, dob, pickupStopId, parentEmail] of routeCStudents) {
      const { rows } = await client.query(
        `INSERT INTO students (school_id, name, class, division, roll_number, dob, student_qr_code, pickup_stop_id, drop_stop_id)
         VALUES ('GREENFIELD',$1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
        [name, klass, division, roll, dob, generateSeedQrCode('STD', `GREENFIELD-STD-${roll}`), pickupStopId]
      );
      const email = parentEmail || `parent.${rows[0].id}@example.com`;
      const parentName = parentEmail ? 'Aisha Mohammed' : `Parent of ${name}`;
      await client.query(
        `INSERT INTO parent_details (student_id, parent_name, relationship, email, phone, whatsapp)
         VALUES ($1,$2,'Father',$3,$4,$4)`,
        [rows[0].id, parentName, email, '+971501234567']
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function seedTraining() {
  await masterPool.query(`
    INSERT INTO training_modules (title, description, video_url, target_role, is_published, view_count, duration_mins) VALUES
    ('Getting Started with SmartTrack', 'Complete overview for school administrators.', 'https://www.youtube.com/embed/EngW7tLk6R8', 'school_admin', true, 145, 12),
    ('Driver App Complete Guide', 'Start trips, mark attendance, handle emergencies.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'driver', true, 213, 15)
  `);
}

async function run() {
  console.log('Dropping existing tenant DBs...');
  await dropAllDatabases();
  console.log('Wiping Master DB...');
  await wipeMaster();
  console.log('Running Master Migrations...');
  await runMigrationsOnPool(masterPool, 'MASTER');
  
  console.log('Seeding plans...');
  await seedPlans();
  console.log('Seeding schools (and provisioning DBs)...');
  await seedSchools();
  console.log('Seeding users (demo accounts)...');
  const userIds = await seedUsers();
  console.log('Seeding subscriptions...');
  await seedSubscriptions();
  console.log('Seeding fleet, routes, students...');
  await seedFleetAndRoutes(userIds['driver@smarttrack.ae']);
  console.log('Seeding training modules...');
  await seedTraining();

  console.log('\nSeed complete. Demo logins:');
  DEMO_ACCOUNTS.forEach((a) => console.log(`  ${a.role.padEnd(13)} ${a.email} / ${a.password}`));
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
