// =====================================================================
// Feedback API Routes (routes/feedback.js)
// Interacts with MongoDB hotel_logs.feedback collection
// =====================================================================

const express = require('express');
const router = express.Router();
const { getMongoDb } = require('../db/mongo');

// GET /api/feedback - List guest reviews from MongoDB
router.get('/', async (req, res, next) => {
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

// POST /api/feedback - Submit new guest review to MongoDB
router.post('/', async (req, res, next) => {
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
