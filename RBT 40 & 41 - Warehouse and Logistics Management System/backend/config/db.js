const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'logistics_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection helper
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[DB] Successfully connected to MySQL database: ${process.env.DB_NAME || 'logistics_db'}`);
    connection.release();
    return true;
  } catch (error) {
    console.error(`[DB Error] Unable to connect to MySQL:`, error.message);
    console.error(`[DB Tip] Please verify credentials in backend/.env file (DB_USER, DB_PASSWORD, DB_NAME, DB_PORT).`);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
