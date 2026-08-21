const { Pool } = require('pg');
const { AsyncLocalStorage } = require('node:async_hooks');
const env = require('./env');

const tenantContext = new AsyncLocalStorage();
const poolCache = new Map();

// The Master Database Pool
const masterPool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.pgSsl ? { rejectUnauthorized: false } : false,
});

masterPool.on('error', (err) => {
  console.error('Unexpected error on idle master PostgreSQL client', err);
  process.exit(1);
});

// Helper to get or create a Tenant Database Pool
function getTenantPool(dbName) {
  if (poolCache.has(dbName)) {
    return poolCache.get(dbName);
  }
  
  // Construct the tenant connection string by replacing the DB name in the master URL
  const url = new URL(env.databaseUrl);
  url.pathname = `/${dbName}`;
  const tenantConnectionString = url.toString();

  const tenantPool = new Pool({
    connectionString: tenantConnectionString,
    ssl: env.pgSsl ? { rejectUnauthorized: false } : false,
  });

  tenantPool.on('error', (err) => {
    console.error(`Unexpected error on idle tenant client for ${dbName}`, err);
  });

  poolCache.set(dbName, tenantPool);
  return tenantPool;
}

// Get the active pool for the current context (defaults to master)
function getActivePool() {
  const store = tenantContext.getStore();
  return store?.pool || masterPool;
}

async function query(text, params) {
  const pool = getActivePool();
  return pool.query(text, params);
}

async function withTransaction(fn) {
  const pool = getActivePool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool: masterPool, // Keep backward compatibility for any direct `pool` references (e.g. scripts)
  masterPool,
  query,
  withTransaction,
  tenantContext,
  getTenantPool,
};
