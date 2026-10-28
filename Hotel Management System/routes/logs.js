// =====================================================================
// Logs & Feedback API Routes (routes/logs.js)
// Interacts with MongoDB hotel_logs database
// activity_logs (audit trail) and feedback (guest reviews)
// =====================================================================

const express = require('express');
const router = express.Router();
const { getMongoDb } = require('../db/mongo');

// GET /api/logs - List audit activity logs from MongoDB
router.get('/', async (req, res, next) => {
  try {
    const db = await getMongoDb();
    const limit = parseInt(req.query.limit || '50', 10);
    const { action, entity } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (entity) filter.entity = entity;

    const logs = await db.collection('activity_logs')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    next(err);
  }
});

// GET /api/feedback - List guest feedback from MongoDB
router.get('/feedback', async (req, res, next) => {
  try {
    const db = await getMongoDb();
    const limit = parseInt(req.query.limit || '50', 10);

    const feedbackList = await db.collection('feedback')
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    res.json({ success: true, count: feedbackList.length, data: feedbackList });
  } catch (err) {
    next(err);
  }
});

// POST /api/feedback - Submit new guest feedback to MongoDB
router.post('/feedback', async (req, res, next) => {
  try {
    const { booking_id, cust_id, cust_name, rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rating (1-5) and comment are required.' 
      });
    }

    const numericRating = parseInt(rating, 10);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ 
        success: false, 
        error: 'Rating must be an integer between 1 and 5.' 
      });
    }

    const doc = {
      booking_id: booking_id ? parseInt(booking_id, 10) : null,
      cust_id: cust_id ? parseInt(cust_id, 10) : null,
      cust_name: cust_name || 'Anonymous Guest',
      rating: numericRating,
      comment: comment.trim(),
      createdAt: new Date()
    };

    const db = await getMongoDb();
    const result = await db.collection('feedback').insertOne(doc);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully.',
      data: { _id: result.insertedId, ...doc }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
