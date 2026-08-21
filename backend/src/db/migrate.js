const fs = require('fs');
const path = require('path');
const { masterPool, getTenantPool } = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrationsOnPool(pool, dbName) {
  console.log(`\n--- Migrating ${dbName} ---`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`apply ${file}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Migration ${file} failed on ${dbName}:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }
}

async function runAll() {
  try {
    // 1. Migrate Master DB
    await runMigrationsOnPool(masterPool, 'MASTER');

    // 2. Fetch all schools and migrate their DBs
    // Check if schools table exists first (might be first run)
    const { rows: tableCheck } = await masterPool.query(`
      SELECT to_regclass('public.schools') as exists;
    `);
    
    if (tableCheck[0].exists) {
      const { rows: schools } = await masterPool.query('SELECT id FROM schools');
      for (const school of schools) {
        const dbName = `smarttrack_${school.id.replace('-', '_').toLowerCase()}`;
        const tenantPool = getTenantPool(dbName);
        await runMigrationsOnPool(tenantPool, dbName);
      }
    }
    console.log('\nAll migrations complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// If run directly (not imported)
if (require.main === module) {
  runAll();
}

module.exports = { runMigrationsOnPool };
