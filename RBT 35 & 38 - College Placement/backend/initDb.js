const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
    console.log('Connecting to MySQL...');
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('Connected! Reading schema.sql...');
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema.sql...');
        await connection.query(schemaSql);
        console.log('Database and tables created successfully!');

        console.log('Reading seed.sql...');
        const seedPath = path.join(__dirname, '../database/seed.sql');
        const seedSql = fs.readFileSync(seedPath, 'utf8');

        console.log('Executing seed.sql...');
        await connection.query(seedSql);
        console.log('Sample data populated successfully!');

        await connection.end();
        console.log('Database initialization completed successfully!');
    } catch (err) {
        console.error('Database initialization error:', err.message);
        if (connection) await connection.end();
    }
}

initDatabase();
