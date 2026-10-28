// =====================================================================
// Dashboard API Routes (routes/dashboard.js)
// Real-time SQL aggregations for dashboard summary metrics
// =====================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');

// GET /api/dashboard/stats - Summary KPI statistics and chart data
router.get('/stats', async (req, res, next) => {
  try {
    // 1. Room summary counts
    const [roomCounts] = await pool.query(`
      SELECT 
        COUNT(*) AS total_rooms,
        SUM(CASE WHEN availability = 'Occupied' THEN 1 ELSE 0 END) AS occupied_rooms,
        SUM(CASE WHEN availability = 'Available' THEN 1 ELSE 0 END) AS available_rooms,
        SUM(CASE WHEN availability = 'Maintenance' THEN 1 ELSE 0 END) AS maintenance_rooms
      FROM room
    `);

    // 2. Today's check-ins and check-outs
    const [todayActivity] = await pool.query(`
      SELECT
        SUM(CASE WHEN check_in = CURDATE() THEN 1 ELSE 0 END) AS todays_checkins,
        SUM(CASE WHEN check_out = CURDATE() THEN 1 ELSE 0 END) AS todays_checkouts
      FROM booking
    `);

    // 3. Revenue aggregations
    const [revenueData] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN MONTH(payment_date) = MONTH(CURDATE()) AND YEAR(payment_date) = YEAR(CURDATE()) THEN amount ELSE 0 END), 0.00) AS revenue_this_month,
        COALESCE(SUM(amount), 0.00) AS total_revenue
      FROM payment
      WHERE status = 'Paid'
    `);

    // 4. Bookings grouped by status
    const [statusDistribution] = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM booking
      GROUP BY status
    `);

    // 5. Room counts by type (for custom bar chart)
    const [typeDistribution] = await pool.query(`
      SELECT 
        r.room_type,
        COUNT(r.room_no) AS total_rooms,
        SUM(CASE WHEN r.availability = 'Occupied' THEN 1 ELSE 0 END) AS occupied_count,
        SUM(CASE WHEN r.availability = 'Available' THEN 1 ELSE 0 END) AS available_count
      FROM room r
      GROUP BY r.room_type
      ORDER BY FIELD(r.room_type, 'Single', 'Double', 'Deluxe', 'Suite')
    `);

    // 6. Recent bookings preview
    const [recentBookings] = await pool.query(`
      SELECT b.booking_id, c.cust_name, b.room_no, r.room_type, b.check_in, b.check_out, b.status
      FROM booking b
      JOIN customer c ON b.cust_id = c.cust_id
      JOIN room r ON b.hotel_id = r.hotel_id AND b.room_no = r.room_no
      ORDER BY b.booking_id DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        rooms: roomCounts[0],
        today: todayActivity[0],
        revenue: revenueData[0],
        bookingsByStatus: statusDistribution,
        roomTypeDistribution: typeDistribution,
        recentBookings
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
