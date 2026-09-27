const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: '/tmp',
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
});

module.exports = pool;