/**
 * Seeds enough data to log in with the same demo credentials the frontend's
 * old fake-auth flow used (src/lib/demoAccounts.ts), so switching to the real
 * API is a drop-in swap. Safe to re-run: wipes seeded tables first.
 */
const bcrypt = require('bcryptjs');
const { pool, query, withTransaction } = require('../config/db');
const { generateQrCode } = require('../utils/qrcode');

const DEMO_ACCOUNTS = [
  { role: 'super_admin', email: 'superadmin@smarttrack.ae', password: 'Super@123', name: 'Khalid Al Maktoum', phone: '+971 50 100 1000' },
  { role: 'school_admin', email: 'admin@greenfield.ae', password: 'School@123', name: 'Hassan Ahmed', school_id: 'SCH-001', phone: '+971 50 200 2000' },
  { role: 'school_admin', email: 'admin@alnoor.ae', password: 'School@123', name: 'Fatima Al Ali', school_id: 'SCH-002', phone: '+971 50 300 3000' },
  { role: 'driver', email: 'driver@smarttrack.ae', password: 'Driver@123', name: 'Salim Ahmed Rashid', school_id: 'SCH-001', phone: '+971 50 400 4000' },
  { role: 'guest_driver', email: 'guest@smarttrack.ae', password: 'Guest@123', name: 'Omar Yusuf', school_id: 'SCH-001', phone: '+971 50 500 5000' },
  { role: 'parent', email: 'parent@smarttrack.ae', password: 'Parent@123', name: 'Aisha Mohammed', school_id: 'SCH-001', phone: '+971 50 600 6000' },
];

async function wipe() {
  const tables = [
    'bus_locations', 'guest_trip_students', 'guest_trips', 'bus_transfers', 'ticket_replies',
    'support_tickets', 'notifications', 'messages', 'lf_claims', 'lost_found_items', 'leaves',
    'attendance_records', 'trips', 'parent_details', 'students', 'stops', 'routes', 'drivers',
    'buses', 'subscriptions', 'users', 'password_resets', 'schools', 'training_modules',
    'plans', 'audit_logs', 'counters',
  ];
  await query(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
}

async function seedPlans() {
  await query(`
    INSERT INTO plans (id, name, label, price_monthly, price_annual, price_per_student, billing_cycle, max_students, max_buses, max_drivers, features, is_popular) VALUES
    ('plan_basic', 'basic', 'Basic', 49, 470, 0.50, 'monthly', 200, 5, 10, ARRAY['GPS Tracking','QR Attendance','Push Notifications','Basic Reports','Email Support'], false),
    ('plan_standard', 'standard', 'Standard', 99, 950, 0.80, 'monthly', 500, 15, 25, ARRAY['Everything in Basic','WhatsApp Alerts','Leave Management','Lost & Found','Bus Transfer','Training Centre','Priority Support'], true),
    ('plan_premium', 'premium', 'Premium', 199, 1910, 1.20, 'monthly', 99999, 99999, 99999, ARRAY['Everything in Standard','Unlimited All','Guest Driver Module','SMS Notifications','Full Analytics','Audit Logs','API Access','Dedicated Support'], false)
  `);
}

async function seedSchools() {
  await query(`
    INSERT INTO schools (id, name, address, city, state, post_code, country, phone, email, website, plan_id, status, subdomain, admin_name, admin_email) VALUES
    ('SCH-001', 'Greenfield Academy', '45 Sheikh Zayed Road', 'Dubai', 'Dubai', '00000', 'UAE', '+971-4-555-0100', 'admin@greenfield.ae', 'www.greenfield.ae', 'plan_premium', 'active', 'greenfield', 'Hassan Ahmed', 'admin@greenfield.ae'),
    ('SCH-002', 'Al-Noor International School', '12 Knowledge Village', 'Abu Dhabi', 'Abu Dhabi', '00000', 'UAE', '+971-2-555-0200', 'admin@alnoor.ae', 'www.alnoor.ae', 'plan_standard', 'active', 'alnoor', 'Fatima Al Ali', 'admin@alnoor.ae')
  `);
}

async function seedUsers() {
  const ids = {};
  for (const acc of DEMO_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(acc.password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, phone, role, school_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [acc.name, acc.email, passwordHash, acc.phone, acc.role, acc.school_id || null]
    );
    ids[acc.email] = rows[0].id;
  }
  return ids;
}

async function seedSubscriptions() {
  await query(`
    INSERT INTO subscriptions (school_id, plan_id, start_date, end_date, amount_paid, payment_method, status) VALUES
    ('SCH-001', 'plan_premium', '2025-09-01', '2026-08-31', 1910, 'Bank Transfer', 'active'),
    ('SCH-002', 'plan_standard', '2025-10-15', '2026-10-14', 950, 'Online', 'active')
  `);
}

async function seedFleetAndRoutes(driverUserId) {
  return withTransaction(async (client) => {
    const driver1 = await client.query(
      `INSERT INTO drivers (school_id, user_id, name, employee_id, email, phone, whatsapp, license_number, license_expiry)
       VALUES ('SCH-001',$1,'Salim Ahmed Rashid','EMP001','driver@smarttrack.ae','+971551234501','+971551234501','DXB-LIC-78901','2027-08-15') RETURNING id`,
      [driverUserId]
    );
    const driver2 = await client.query(
      `INSERT INTO drivers (school_id, name, employee_id, email, phone, whatsapp, license_number, license_expiry)
       VALUES ('SCH-001','Ali Mohammed Al-Faris','EMP002','ali.driver@greenfield.ae','+971551234502','+971551234502','DXB-LIC-78902','2026-03-20') RETURNING id`
    );
    const driverId1 = driver1.rows[0].id;
    const driverId2 = driver2.rows[0].id;

    const bus1 = await client.query(
      `INSERT INTO buses (school_id, bus_number, seat_capacity, make_model, year, insurance_expiry, fitness_cert_expiry, safety_qr_code, driver_id, status)
       VALUES ('SCH-001','B-001',45,'Toyota Coaster 2022',2022,'2026-12-31','2026-06-30',$1,$2,'idle') RETURNING id`,
      [generateQrCode('BUS'), driverId1]
    );
    const bus2 = await client.query(
      `INSERT INTO buses (school_id, bus_number, seat_capacity, make_model, year, insurance_expiry, fitness_cert_expiry, safety_qr_code, driver_id, status)
       VALUES ('SCH-001','B-002',35,'Mitsubishi Rosa 2021',2021,'2026-08-15','2026-08-15',$1,$2,'idle') RETURNING id`,
      [generateQrCode('BUS'), driverId2]
    );
    const busId1 = bus1.rows[0].id;
    const busId2 = bus2.rows[0].id;

    await client.query(`UPDATE drivers SET assigned_bus_id = $1 WHERE id = $2`, [busId1, driverId1]);
    await client.query(`UPDATE drivers SET assigned_bus_id = $1 WHERE id = $2`, [busId2, driverId2]);

    const route1 = await client.query(
      `INSERT INTO routes (school_id, bus_id, driver_id, name, type, start_point, end_point, route_qr_code)
       VALUES ('SCH-001',$1,$2,'Route A - Pickup','pickup','Al Barsha South','Greenfield Academy',$3) RETURNING id`,
      [busId1, driverId1, generateQrCode('RT')]
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

    const students = [
      ['Ahmed Hassan Al-Rashid', '5', 'A', '501', '2015-03-12', stop1.rows[0].id],
      ['Fatima Noor Al-Zahra', '3', 'B', '302', '2017-07-22', stop2.rows[0].id],
      ['Mohammed Khalid Ibrahim', '7', 'A', '701', '2013-11-05', stop1.rows[0].id],
    ];
    for (const [name, klass, division, roll, dob, pickupStopId] of students) {
      const { rows } = await client.query(
        `INSERT INTO students (school_id, name, class, division, roll_number, dob, student_qr_code, pickup_stop_id)
         VALUES ('SCH-001',$1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [name, klass, division, roll, dob, generateQrCode('STD'), pickupStopId]
      );
      await client.query(
        `INSERT INTO parent_details (student_id, parent_name, relationship, email, phone, whatsapp)
         VALUES ($1,$2,'Father',$3,$4,$4)`,
        [rows[0].id, `Parent of ${name}`, `parent.${rows[0].id}@example.com`, '+971501234567']
      );
    }
  });
}

async function seedTraining() {
  await query(`
    INSERT INTO training_modules (title, description, video_url, target_role, is_published, view_count, duration_mins) VALUES
    ('Getting Started with SmartTrack', 'Complete overview for school administrators.', 'https://www.youtube.com/embed/EngW7tLk6R8', 'school_admin', true, 145, 12),
    ('Driver App Complete Guide', 'Start trips, mark attendance, handle emergencies.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'driver', true, 213, 15)
  `);
}

async function run() {
  console.log('Wiping existing seed data...');
  await wipe();
  console.log('Seeding plans...');
  await seedPlans();
  console.log('Seeding schools...');
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
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
