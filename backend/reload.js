require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});
pool.query("NOTIFY pgrst, 'reload schema'")
  .then(() => console.log('Schema Reloaded'))
  .catch(console.error)
  .finally(() => pool.end());
