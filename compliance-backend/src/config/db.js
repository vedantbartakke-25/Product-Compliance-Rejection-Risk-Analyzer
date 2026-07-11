const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Initialize the Connection Pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Event Listener for unexpected errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Export a query wrapper function
// This allows us to log queries easily in the future if needed
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool, // Export pool for graceful shutdown if needed
};
