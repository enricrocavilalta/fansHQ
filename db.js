const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'fghjFGHJ85', // pon tu pass aquí si no usas .env
  database: process.env.DB_NAME || 'fanshq'
});

module.exports = pool;
