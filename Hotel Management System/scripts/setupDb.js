// =====================================================================
// Database Setup Script (scripts/setupDb.js)
// Runs schema.sql, procedures.sql, seed.sql on MySQL
// Initializes hotel_logs, collections, indexes, and seeds on MongoDB
// =====================================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || '3306', 10);
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'hotel_db';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DATABASE = process.env.MONGO_DATABASE || 'hotel_logs';

// Path to mysql.exe on standard Windows installation
const COMMON_MYSQL_PATHS = [
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.1\\bin\\mysql.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.2\\bin\\mysql.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.3\\bin\\mysql.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe',
  'mysql'
];

function findMysqlCli() {
  for (const p of COMMON_MYSQL_PATHS) {
    try {
      if (p === 'mysql') {
        execSync('where mysql', { stdio: 'ignore' });
        return 'mysql';
      } else if (fs.existsSync(p)) {
        return `"${p}"`;
      }
    } catch {
      // continue search
    }
  }
  return null;
}

// Fallback SQL splitter for Node.js mysql2 driver when DELIMITER is used
function parseSqlStatements(sqlContent) {
  const statements = [];
  const lines = sqlContent.split(/\r?\n/);
  let currentDelimiter = ';';
  let buffer = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toUpperCase().startsWith('DELIMITER')) {
      const parts = trimmed.split(/\s+/);
      if (parts[1]) {
        currentDelimiter = parts[1];
      }
      continue;
    }

    buffer.push(line);
    const combined = buffer.join('\n');
    if (combined.trim().endsWith(currentDelimiter)) {
      let stmt = combined.trim();
      stmt = stmt.slice(0, stmt.length - currentDelimiter.length).trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      buffer = [];
    }
  }

  if (buffer.length > 0) {
    const remaining = buffer.join('\n').trim();
    if (remaining.length > 0) {
      statements.push(remaining);
    }
  }

  return statements;
}

async function setupMySQL() {
  console.log('\n--- 1. Setting up MySQL Database (hotel_db) ---');

  if (MYSQL_PASSWORD === '' && process.env.MYSQL_PASSWORD === undefined) {
    console.error('ERROR: MYSQL_PASSWORD is not set in .env.');
    console.error('Please open .env and set MYSQL_PASSWORD=your_password');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const proceduresPath = path.join(__dirname, '..', 'sql', 'procedures.sql');
  const seedPath = path.join(__dirname, '..', 'sql', 'seed.sql');

  const mysqlCli = findMysqlCli();

  if (mysqlCli) {
    console.log(`Using MySQL CLI tool: ${mysqlCli}`);
    const passArg = MYSQL_PASSWORD ? `-p"${MYSQL_PASSWORD}"` : '';
    const baseCmd = `${mysqlCli} -h ${MYSQL_HOST} -P ${MYSQL_PORT} -u ${MYSQL_USER} ${passArg}`;

    try {
      console.log('-> Executing sql/schema.sql...');
      execSync(`${baseCmd} < "${schemaPath}"`, { stdio: 'inherit', shell: 'cmd.exe' });

      console.log('-> Executing sql/procedures.sql...');
      execSync(`${baseCmd} ${MYSQL_DATABASE} < "${proceduresPath}"`, { stdio: 'inherit', shell: 'cmd.exe' });

      console.log('-> Executing sql/seed.sql...');
      execSync(`${baseCmd} ${MYSQL_DATABASE} < "${seedPath}"`, { stdio: 'inherit', shell: 'cmd.exe' });

      console.log('MySQL setup via CLI completed successfully.');
    } catch (err) {
      console.warn('CLI execution encountered an error, falling back to mysql2 driver...', err.message);
      await setupMySQLViaDriver(schemaPath, proceduresPath, seedPath);
    }
  } else {
    console.log('MySQL CLI not found, executing via Node mysql2 driver...');
    await setupMySQLViaDriver(schemaPath, proceduresPath, seedPath);
  }

  // Verification step
  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE
  });

  const [tables] = await conn.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
  const [views] = await conn.query('SHOW FULL TABLES WHERE Table_type = "VIEW"');
  const [procedures] = await conn.query(`
    SELECT ROUTINE_NAME, ROUTINE_TYPE 
    FROM information_schema.ROUTINES 
    WHERE ROUTINE_SCHEMA = ?
  `, [MYSQL_DATABASE]);
  const [triggers] = await conn.query(`
    SELECT TRIGGER_NAME 
    FROM information_schema.TRIGGERS 
    WHERE TRIGGER_SCHEMA = ?
  `, [MYSQL_DATABASE]);

  console.log(`Verified MySQL Objects in ${MYSQL_DATABASE}:`);
  console.log(`- Base Tables (${tables.length}):`, tables.map(t => Object.values(t)[0]).join(', '));
  console.log(`- Views (${views.length}):`, views.map(v => Object.values(v)[0]).join(', '));
  console.log(`- Stored Routines (${procedures.length}):`, procedures.map(p => `${p.ROUTINE_NAME} (${p.ROUTINE_TYPE})`).join(', '));
  console.log(`- Triggers (${triggers.length}):`, triggers.map(t => t.TRIGGER_NAME).join(', '));

  await conn.end();
}

async function setupMySQLViaDriver(schemaPath, proceduresPath, seedPath) {
  // Connect initially without database to run schema creation
  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true
  });

  console.log('Running schema.sql via driver...');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await conn.query(schemaSql);

  await conn.changeUser({ database: MYSQL_DATABASE });

  console.log('Running procedures.sql via driver...');
  const procSql = fs.readFileSync(proceduresPath, 'utf8');
  const procStatements = parseSqlStatements(procSql);
  for (const stmt of procStatements) {
    if (stmt.trim()) {
      await conn.query(stmt);
    }
  }

  console.log('Running seed.sql via driver...');
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  await conn.query(seedSql);

  await conn.end();
  console.log('MySQL setup via driver completed successfully.');
}

async function setupMongoDB() {
  console.log('\n--- 2. Setting up MongoDB Database (hotel_logs) ---');
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(MONGO_DATABASE);

    // Drop previous collections for a clean run
    try { await db.collection('activity_logs').drop(); } catch {}
    try { await db.collection('feedback').drop(); } catch {}

    const logsColl = db.collection('activity_logs');
    const feedbackColl = db.collection('feedback');

    // Create Indexes
    await logsColl.createIndex({ timestamp: -1 });
    await logsColl.createIndex({ action: 1 });
    await feedbackColl.createIndex({ createdAt: -1 });
    await feedbackColl.createIndex({ booking_id: 1 });

    // 15 Activity logs (covering booking, check-in, check-out, cancellation, payment, edit)
    const seedLogs = [
      {
        action: 'CREATE_BOOKING',
        entity: 'booking',
        entity_id: 1,
        performed_by: 'Priya Nair (Receptionist)',
        details: { cust_id: 1, room_no: '101', check_in: '2026-09-01', check_out: '2026-09-04', guests: 1 },
        timestamp: new Date('2026-08-28T10:15:00Z')
      },
      {
        action: 'PAYMENT_RECEIVED',
        entity: 'payment',
        entity_id: 1,
        performed_by: 'Priya Nair (Receptionist)',
        details: { booking_id: 1, amount: 4500.00, mode: 'UPI', ref: 'TXN-UPI-009101' },
        timestamp: new Date('2026-09-01T11:00:00Z')
      },
      {
        action: 'CHECK_IN',
        entity: 'booking',
        entity_id: 1,
        performed_by: 'Priya Nair (Receptionist)',
        details: { room_no: '101', guest: 'Rohan Verma' },
        timestamp: new Date('2026-09-01T11:05:00Z')
      },
      {
        action: 'CHECK_OUT',
        entity: 'booking',
        entity_id: 1,
        performed_by: 'Amitabh Sen (Receptionist)',
        details: { room_no: '101', guest: 'Rohan Verma', balance_cleared: true },
        timestamp: new Date('2026-09-04T10:30:00Z')
      },
      {
        action: 'CREATE_BOOKING',
        entity: 'booking',
        entity_id: 2,
        performed_by: 'Amitabh Sen (Receptionist)',
        details: { cust_id: 2, room_no: '202', check_in: '2026-09-05', check_out: '2026-09-08', guests: 2 },
        timestamp: new Date('2026-09-02T14:20:00Z')
      },
      {
        action: 'CHECK_IN',
        entity: 'booking',
        entity_id: 2,
        performed_by: 'Amitabh Sen (Receptionist)',
        details: { room_no: '202', guest: 'Sneha Kulkarni' },
        timestamp: new Date('2026-09-05T12:00:00Z')
      },
      {
        action: 'PAYMENT_RECEIVED',
        entity: 'payment',
        entity_id: 2,
        performed_by: 'Amitabh Sen (Receptionist)',
        details: { booking_id: 2, amount: 7500.00, mode: 'Card', ref: 'TXN-CRD-009202' },
        timestamp: new Date('2026-09-05T12:15:00Z')
      },
      {
        action: 'CHECK_OUT',
        entity: 'booking',
        entity_id: 2,
        performed_by: 'Priya Nair (Receptionist)',
        details: { room_no: '202', guest: 'Sneha Kulkarni', balance_cleared: true },
        timestamp: new Date('2026-09-08T11:00:00Z')
      },
      {
        action: 'CREATE_BOOKING',
        entity: 'booking',
        entity_id: 6,
        performed_by: 'Priya Nair (Receptionist)',
        details: { cust_id: 6, room_no: '102', check_in: '2026-10-10', check_out: '2026-10-14', guests: 1 },
        timestamp: new Date('2026-10-08T09:30:00Z')
      },
      {
        action: 'CHECK_IN',
        entity: 'booking',
        entity_id: 6,
        performed_by: 'Priya Nair (Receptionist)',
        details: { room_no: '102', guest: 'Deepika Menon' },
        timestamp: new Date('2026-10-10T14:00:00Z')
      },
      {
        action: 'PAYMENT_RECEIVED',
        entity: 'payment',
        entity_id: 6,
        performed_by: 'Priya Nair (Receptionist)',
        details: { booking_id: 6, amount: 3000.00, mode: 'UPI', ref: 'TXN-UPI-010102', note: 'Partial deposit' },
        timestamp: new Date('2026-10-10T14:10:00Z')
      },
      {
        action: 'ROOM_EDIT',
        entity: 'room',
        entity_id: '1-104',
        performed_by: 'Rajesh Sharma (Manager)',
        details: { field: 'availability', oldValue: 'Available', newValue: 'Maintenance', reason: 'AC servicing' },
        timestamp: new Date('2026-10-09T16:00:00Z')
      },
      {
        action: 'CANCEL_BOOKING',
        entity: 'booking',
        entity_id: 12,
        performed_by: 'Amitabh Sen (Receptionist)',
        details: { reason: 'Guest cancelled travel plans', cust_id: 5, room_no: '205' },
        timestamp: new Date('2026-10-01T15:30:00Z')
      },
      {
        action: 'CHECK_IN',
        entity: 'booking',
        entity_id: 7,
        performed_by: 'Amitabh Sen (Receptionist)',
        details: { room_no: '201', guest: 'Siddharth Joshi' },
        timestamp: new Date('2026-10-11T13:45:00Z')
      },
      {
        action: 'CHECK_IN',
        entity: 'booking',
        entity_id: 10,
        performed_by: 'Priya Nair (Receptionist)',
        details: { room_no: '401', guest: 'Ananya Deshmukh' },
        timestamp: new Date('2026-10-12T11:20:00Z')
      }
    ];

    // 6 Feedback documents
    const seedFeedback = [
      {
        booking_id: 1,
        cust_id: 1,
        cust_name: 'Rohan Verma',
        rating: 5,
        comment: 'Exemplary service! The room was spotless and check-in was seamless.',
        createdAt: new Date('2026-09-04T12:00:00Z')
      },
      {
        booking_id: 2,
        cust_id: 2,
        cust_name: 'Sneha Kulkarni',
        rating: 4,
        comment: 'Very comfortable stay. Breakfast buffet by Chef Sanjeev was delightful.',
        createdAt: new Date('2026-09-08T13:30:00Z')
      },
      {
        booking_id: 3,
        cust_id: 3,
        cust_name: 'Arjun Iyer',
        rating: 5,
        comment: 'The Deluxe room has great city views. Receptionist Priya was exceptionally courteous.',
        createdAt: new Date('2026-09-14T11:15:00Z')
      },
      {
        booking_id: 4,
        cust_id: 4,
        cust_name: 'Kavita Reddy',
        rating: 5,
        comment: 'Loved the Royal Suite! High speed Wi-Fi and luxurious amenities. Will visit again.',
        createdAt: new Date('2026-09-18T10:45:00Z')
      },
      {
        booking_id: 5,
        cust_id: 5,
        cust_name: 'Manish Gupta',
        rating: 3,
        comment: 'Decent stay overall, but room service took slightly longer during peak dinner hours.',
        createdAt: new Date('2026-09-22T14:10:00Z')
      },
      {
        booking_id: 7,
        cust_id: 7,
        cust_name: 'Siddharth Joshi',
        rating: 4,
        comment: 'Fast check-in process and clean rooms. Great location near MG Road.',
        createdAt: new Date('2026-10-11T16:00:00Z')
      }
    ];

    await logsColl.insertMany(seedLogs);
    await feedbackColl.insertMany(seedFeedback);

    const logCount = await logsColl.countDocuments();
    const fbCount = await feedbackColl.countDocuments();

    console.log(`Verified MongoDB in ${MONGO_DATABASE}:`);
    console.log(`- activity_logs documents: ${logCount}`);
    console.log(`- feedback documents: ${fbCount}`);
    console.log('MongoDB setup completed successfully.');
  } finally {
    await client.close();
  }
}

async function main() {
  console.log('====================================================');
  console.log('   Hotel Management System - Database Initializer   ');
  console.log('====================================================');

  try {
    await setupMySQL();
    await setupMongoDB();
    console.log('\nAll databases (MySQL & MongoDB) have been fully initialized and verified!');
  } catch (err) {
    console.error('\nDatabase initialization failed:', err.message);
    process.exit(1);
  }
}

main();
