// =====================================================================
// Bookings API Routes (routes/bookings.js)
// Stored procedure calls for business logic:
// sp_create_booking, sp_check_in, sp_check_out, sp_cancel_booking,
// and v_booking_bill view for billing calculations
// =====================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');
const { logActivity } = require('../db/mongo');

// GET /api/bookings - List bookings with optional status filter
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        b.booking_id,
        b.cust_id,
        c.cust_name,
        c.phone_no AS customer_phone,
        b.hotel_id,
        b.room_no,
        r.room_type,
        r.price_per_night,
        b.emp_id,
        e.emp_name AS receptionist_name,
        b.check_in,
        b.check_out,
        DATEDIFF(b.check_out, b.check_in) AS nights,
        b.no_of_people,
        b.status,
        (DATEDIFF(b.check_out, b.check_in) * r.price_per_night) AS room_charges,
        COALESCE(p.total_paid, 0.00) AS total_paid,
        ((DATEDIFF(b.check_out, b.check_in) * r.price_per_night) - COALESCE(p.total_paid, 0.00)) AS balance_due
      FROM booking b
      JOIN customer c ON b.cust_id = c.cust_id
      JOIN room r ON b.hotel_id = r.hotel_id AND b.room_no = r.room_no
      JOIN employee e ON b.emp_id = e.emp_id
      LEFT JOIN (
        SELECT booking_id, SUM(amount) AS total_paid
        FROM payment
        WHERE status = 'Paid'
        GROUP BY booking_id
      ) p ON b.booking_id = p.booking_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.booking_id DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id - Get detailed booking with customer and room info
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM v_booking_details WHERE booking_id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id/bill - Retrieve billing information from v_booking_bill view
router.get('/:id/bill', async (req, res, next) => {
  try {
    const [billRows] = await pool.query(
      'SELECT * FROM v_booking_bill WHERE booking_id = ?',
      [req.params.id]
    );

    if (billRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }

    const [payments] = await pool.query(
      'SELECT payment_id, amount, payment_mode, payment_date, transaction_ref, status FROM payment WHERE booking_id = ? ORDER BY payment_date DESC, payment_id DESC',
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        bill: billRows[0],
        payments
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings - Create booking via stored procedure sp_create_booking
router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const {
      cust_id,
      hotel_id = 1,
      room_no,
      emp_id,
      check_in,
      check_out,
      no_of_people,
      performed_by
    } = req.body;

    if (!cust_id || !room_no || !emp_id || !check_in || !check_out || !no_of_people) {
      return res.status(400).json({
        success: false,
        error: 'cust_id, room_no, emp_id, check_in, check_out, and no_of_people are required.'
      });
    }

    // Call stored procedure
    await conn.query(
      'CALL sp_create_booking(?, ?, ?, ?, ?, ?, ?, @out_booking_id)',
      [cust_id, hotel_id, room_no, emp_id, check_in, check_out, no_of_people]
    );

    const [outRows] = await conn.query('SELECT @out_booking_id AS booking_id');
    const newBookingId = outRows[0].booking_id;

    await logActivity({
      action: 'CREATE_BOOKING',
      entity: 'booking',
      entity_id: newBookingId,
      performed_by,
      details: { cust_id, hotel_id, room_no, emp_id, check_in, check_out, no_of_people }
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully.',
      data: { booking_id: newBookingId }
    });
  } catch (err) {
    next(err);
  } finally {
    conn.release();
  }
});

// POST /api/bookings/:id/check-in - Check-in via stored procedure sp_check_in
router.post('/:id/check-in', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { performed_by } = req.body || {};

    await pool.query('CALL sp_check_in(?)', [id]);

    await logActivity({
      action: 'CHECK_IN',
      entity: 'booking',
      entity_id: parseInt(id, 10),
      performed_by,
      details: { booking_id: id }
    });

    res.json({
      success: true,
      message: `Booking #${id} successfully checked in. Room marked as Occupied.`
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/check-out - Check-out via stored procedure sp_check_out
router.post('/:id/check-out', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { performed_by } = req.body || {};

    await pool.query('CALL sp_check_out(?)', [id]);

    await logActivity({
      action: 'CHECK_OUT',
      entity: 'booking',
      entity_id: parseInt(id, 10),
      performed_by,
      details: { booking_id: id }
    });

    res.json({
      success: true,
      message: `Booking #${id} successfully checked out. Room released as Available.`
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/cancel - Cancel booking via stored procedure sp_cancel_booking
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { performed_by } = req.body || {};

    await pool.query('CALL sp_cancel_booking(?)', [id]);

    await logActivity({
      action: 'CANCEL_BOOKING',
      entity: 'booking',
      entity_id: parseInt(id, 10),
      performed_by,
      details: { booking_id: id }
    });

    res.json({
      success: true,
      message: `Booking #${id} has been cancelled.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
