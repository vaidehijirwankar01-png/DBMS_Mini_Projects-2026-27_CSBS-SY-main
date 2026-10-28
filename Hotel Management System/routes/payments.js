// =====================================================================
// Payments API Routes (routes/payments.js)
// Stored procedure sp_add_payment with overpayment protection
// =====================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');
const { logActivity } = require('../db/mongo');

// GET /api/payments - List payments with booking, customer, and room info
router.get('/', async (req, res, next) => {
  try {
    const { booking_id } = req.query;
    let query = `
      SELECT 
        p.payment_id,
        p.booking_id,
        p.amount,
        p.payment_mode,
        p.payment_date,
        p.transaction_ref,
        p.status AS payment_status,
        c.cust_name,
        b.room_no,
        r.room_type
      FROM payment p
      JOIN booking b ON p.booking_id = b.booking_id
      JOIN customer c ON b.cust_id = c.cust_id
      JOIN room r ON b.hotel_id = r.hotel_id AND b.room_no = r.room_no
      WHERE 1=1
    `;
    const params = [];

    if (booking_id) {
      query += ' AND p.booking_id = ?';
      params.push(booking_id);
    }

    query += ' ORDER BY p.payment_id DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments - Record a payment via stored procedure sp_add_payment
router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { booking_id, amount, payment_mode, transaction_ref, performed_by } = req.body;

    if (!booking_id || !amount || !payment_mode) {
      return res.status(400).json({
        success: false,
        error: 'booking_id, amount, and payment_mode are required.'
      });
    }

    // Auto-generate transaction reference if not entered
    const txRef = transaction_ref || `TXN-${payment_mode.slice(0,3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    // Call stored procedure
    await conn.query(
      'CALL sp_add_payment(?, ?, ?, ?, @out_payment_id)',
      [booking_id, amount, payment_mode, txRef]
    );

    const [outRows] = await conn.query('SELECT @out_payment_id AS payment_id');
    const paymentId = outRows[0].payment_id;

    await logActivity({
      action: 'PAYMENT_RECEIVED',
      entity: 'payment',
      entity_id: paymentId,
      performed_by,
      details: { booking_id, amount, payment_mode, transaction_ref: txRef }
    });

    res.status(201).json({
      success: true,
      message: `Payment of ₹${amount} recorded successfully.`,
      data: { payment_id: paymentId, booking_id, amount, payment_mode, transaction_ref: txRef }
    });
  } catch (err) {
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
