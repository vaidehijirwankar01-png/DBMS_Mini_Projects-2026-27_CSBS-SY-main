const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function setupDatabase() {
  console.log('--- Starting Database Setup ---');
  console.log(`Connecting to MySQL host: ${process.env.DB_HOST || 'localhost'}, user: ${process.env.DB_USER || 'root'}`);

  let connection;
  try {
    // Connect without database first to allow CREATE DATABASE
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      multipleStatements: true
    });

    console.log('Connected to MySQL server.');

    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');

    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql (tables, views, stored procedures, triggers)...');
    await connection.query(schemaSql);
    console.log('Schema created successfully.');

    console.log('Reading seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('Executing seed.sql (sample warehouses, products, carriers, stock, shipments)...');
    await connection.query(seedSql);
    console.log('Seed data inserted successfully.');

    console.log('====================================================');
    console.log('Database logistics_db is completely setup and ready!');
    console.log('====================================================');
  } catch (error) {
    console.error('Setup failed:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nAccess denied! Please update DB_PASSWORD in backend/.env with your MySQL root password.');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
