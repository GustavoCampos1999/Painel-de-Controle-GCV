require('dotenv').config(); 
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false 
  }
});

pool.on('connect', () => {
  console.log('Conectado com sucesso ao banco de dados Supabase (PostgreSQL).');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool 
};