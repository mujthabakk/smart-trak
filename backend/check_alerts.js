const { Pool } = require('pg');
async function check() {
  const master = new Pool({ connectionString: 'postgresql://postgres:12345@localhost:5432/smarttrack' });
  const { rows: schools } = await master.query('SELECT id FROM schools LIMIT 1');
  const dbName = 'smarttrack_' + schools[0].id.replace('-', '_').toLowerCase();
  const tenant = new Pool({ connectionString: 'postgresql://postgres:12345@localhost:5432/' + dbName });
  const { rows: tables } = await tenant.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name ILIKE '%alert%' OR table_name ILIKE '%notification%')");
  console.log('Tables:', tables);
  if(tables.length > 0) {
    for (let table of tables) {
      const { rows: cols } = await tenant.query("SELECT column_name FROM information_schema.columns WHERE table_name = '" + table.table_name + "'");
      console.log('Cols for', table.table_name, ':', cols.map(c => c.column_name));
    }
  }
  process.exit(0);
}
check();
