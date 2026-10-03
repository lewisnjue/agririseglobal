const path = require('path');
const { Pool } = require('pg');

// Load .env from server directory so it works regardless of cwd
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set in server/.env');
}

const isLocalhost = /localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString,
  // Disable SSL for local Docker Postgres (pg can fail otherwise)
  ...(isLocalhost && { ssl: false }),
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
