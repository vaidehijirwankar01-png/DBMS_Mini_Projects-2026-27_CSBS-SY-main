// =====================================================================
// MongoDB Connection & Helper (db/mongo.js)
// Stores flexible append-heavy activity logs and customer feedback
// =====================================================================

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DATABASE || 'hotel_logs';

const client = new MongoClient(uri);
let dbInstance = null;

async function getMongoDb() {
  if (!dbInstance) {
    await client.connect();
    dbInstance = client.db(dbName);
  }
  return dbInstance;
}

/**
 * Log any business activity to MongoDB
 * @param {Object} entry { action, entity, entity_id, performed_by, details }
 */
async function logActivity({ action, entity, entity_id, performed_by, details }) {
  try {
    const db = await getMongoDb();
    const doc = {
      action,
      entity,
      entity_id,
      performed_by: performed_by || 'System',
      details: details || {},
      timestamp: new Date()
    };
    await db.collection('activity_logs').insertOne(doc);
    return doc;
  } catch (err) {
    console.error('Failed to write activity log to MongoDB:', err.message);
    // Don't crash main transaction if non-critical logging fails
    return null;
  }
}

module.exports = {
  getMongoDb,
  logActivity
};
