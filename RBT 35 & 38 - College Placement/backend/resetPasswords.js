const db = require('./config/db');
const bcrypt = require('bcrypt');

async function reset() {
  const hash = await bcrypt.hash('password', 10);
  console.log('Generated valid bcrypt hash:', hash);
  await db.execute('UPDATE users SET password_hash = ?', [hash]);
  console.log('Successfully updated all users in database with password: password');
  process.exit(0);
}

reset();
