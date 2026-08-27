const { Pool } = require('pg');

async function clearData() {
  const master = new Pool({ connectionString: 'postgresql://postgres:12345@localhost:5432/smarttrack' });
  const { rows: schools } = await master.query('SELECT id FROM schools');
  
  if (schools.length === 0) {
    console.log('No schools found.');
    process.exit(0);
  }

  for (const school of schools) {
    const dbName = `smarttrack_${school.id.replace(/-/g, '_').toLowerCase()}`;
    console.log(`Connecting to tenant database: ${dbName}`);
    
    const tenant = new Pool({ connectionString: `postgresql://postgres:12345@localhost:5432/${dbName}` });
    
    try {
      console.log(`Clearing attendance_records for ${dbName}...`);
      await tenant.query('DELETE FROM attendance_records');
      
      console.log(`Clearing trips for ${dbName}...`);
      await tenant.query('DELETE FROM trips');
      
      console.log(`Data cleared for ${dbName}.\n`);
    } catch (err) {
      console.error(`Failed to clear data for ${dbName}:`, err.message);
    } finally {
      await tenant.end();
    }
  }

  await master.end();
  console.log('Finished clearing all attendance and trip data.');
  process.exit(0);
}

clearData();
