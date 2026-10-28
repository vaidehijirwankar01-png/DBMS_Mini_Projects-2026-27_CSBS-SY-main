// =====================================================================
// MySQL Connection Pool (db/mysql.js)
// Using mysql2/promise for async/await parameterized queries
// =====================================================================

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE || 'hotel_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});

module.exports = pool;
