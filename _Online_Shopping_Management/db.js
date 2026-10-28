require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'shopping_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper function to test DB connection on startup
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connected successfully to MySQL database:', process.env.DB_NAME || 'shopping_db');
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed!');
    console.error('Reason:', err.message);
    console.error('👉 Tip: Check your DB_PASSWORD in the .env file and ensure MySQL is running.\n');
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
