const { Pool } = require('pg');

async function check() {
  const master = new Pool({ connectionString: 'postgresql://postgres:12345@localhost:5432/smarttrack' });
  const { rows: schools } = await master.query('SELECT id FROM schools LIMIT 1');
  if (!schools.length) return console.log('No schools');
  
  const dbName = `smarttrack_${schools[0].id.replace('-', '_').toLowerCase()}`;
  const tenant = new Pool({ connectionString: `postgresql://postgres:12345@localhost:5432/${dbName}` });
  
  const { rows } = await tenant.query('SELECT id, date, created_at FROM attendance_records ORDER BY created_at DESC LIMIT 10');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
check();
