const { Pool } = require('pg');
async function insertLeave() {
  const master = new Pool({ connectionString: 'postgresql://postgres:12345@localhost:5432/smarttrack' });
  const { rows: schools } = await master.query('SELECT id FROM schools LIMIT 1');
  const schoolId = schools[0].id;
  const dbName = 'smarttrack_' + schoolId.replace('-', '_').toLowerCase();
  const tenant = new Pool({ connectionString: 'postgresql://postgres:12345@localhost:5432/' + dbName });
  
  // Find Ahmed Hassan
  const { rows: students } = await tenant.query("SELECT id FROM students WHERE name ILIKE '%Ahmed hassan%' LIMIT 1");
  if (!students.length) {
    console.log('Student not found');
    process.exit(1);
  }
  const studentId = students[0].id;
  console.log('Found student:', studentId);
  
  // Find a valid user for approved_by
  const { rows: users } = await tenant.query("SELECT id FROM users LIMIT 1");
  const approvedBy = users.length > 0 ? users[0].id : null;
  console.log('Found user for approved_by:', approvedBy);
  
  // Insert leave
  const leaveId = 'LEV-' + Date.now();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  const query = `
    INSERT INTO leaves (id, student_id, school_id, from_date, to_date, reason, status, approved_by, approved_at, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *;
  `;
  const values = [
    leaveId,
    studentId,
    schoolId,
    yesterday.toISOString().split('T')[0],
    tomorrow.toISOString().split('T')[0],
    'Sick leave for testing',
    'approved',
    approvedBy
  ];
  
  const { rows: leaves } = await tenant.query(query, values);
  console.log('Inserted leave:', leaves[0]);
  process.exit(0);
}
insertLeave();
