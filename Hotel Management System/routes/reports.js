// =====================================================================
// Reports API Routes (routes/reports.js)
// Executes the 10 analytical queries from sql/reports.sql
// =====================================================================

const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');

// Report queries dictionary with title, concept, and SQL statement
const REPORT_DEFINITIONS = [
  {
    id: 1,
    title: 'Monthly Revenue Breakdown',
    concept: 'GROUP BY, DATE_FORMAT, SUM(), AVG(), ORDER BY',
    description: 'Aggregates revenue and transaction volumes month-by-month.',
    sql: `
      SELECT 
        DATE_FORMAT(payment_date, '%Y-%m') AS month,
        COUNT(payment_id) AS total_transactions,
        SUM(amount) AS total_revenue,
        ROUND(AVG(amount), 2) AS average_transaction_amount
      FROM payment
      WHERE status = 'Paid'
      GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
      ORDER BY month DESC;
    `
  },
  {
    id: 2,
    title: 'Room Occupancy & Revenue by Room Type',
    concept: 'JOIN, COUNT(), SUM(), GROUP BY',
    description: 'Analyzes which room category generates the most booking volume and income.',
    sql: `
      SELECT 
        r.room_type,
        COUNT(b.booking_id) AS total_bookings,
        SUM(DATEDIFF(b.check_out, b.check_in)) AS total_nights_booked,
        SUM(DATEDIFF(b.check_out, b.check_in) * r.price_per_night) AS estimated_revenue
      FROM room r
      JOIN booking b ON r.hotel_id = b.hotel_id AND r.room_no = b.room_no
      WHERE b.status IN ('Checked-in', 'Checked-out')
      GROUP BY r.room_type
      ORDER BY estimated_revenue DESC;
    `
  },
  {
    id: 3,
    title: 'Top High-Value Customers (Spend >= ₹10,000)',
    concept: 'JOIN across 3 tables, SUM(), GROUP BY, HAVING, ORDER BY',
    description: 'Identifies VIP guests for loyalty rewards and discount promotions.',
    sql: `
      SELECT 
        c.cust_id,
        c.cust_name,
        c.phone_no,
        c.email,
        COUNT(DISTINCT b.booking_id) AS completed_bookings,
        SUM(p.amount) AS total_spent
      FROM customer c
      JOIN booking b ON c.cust_id = b.cust_id
      JOIN payment p ON b.booking_id = p.booking_id
      WHERE p.status = 'Paid'
      GROUP BY c.cust_id, c.cust_name, c.phone_no, c.email
      HAVING total_spent >= 10000.00
      ORDER BY total_spent DESC;
    `
  },
  {
    id: 4,
    title: 'Unpaid Balances for Active & Booked Reservations',
    concept: 'Querying calculated View (v_booking_bill), WHERE filter, ORDER BY',
    description: 'Displays guests with pending balances to prompt front-desk collection.',
    sql: `
      SELECT 
        booking_id,
        cust_name,
        room_no,
        room_type,
        booking_status,
        nights,
        room_charges,
        total_paid,
        balance_due
      FROM v_booking_bill
      WHERE balance_due > 0 AND booking_status IN ('Booked', 'Checked-in')
      ORDER BY balance_due DESC;
    `
  },
  {
    id: 5,
    title: 'Rooms That Have Never Been Booked',
    concept: 'LEFT JOIN, IS NULL filter (Subquery / Set Difference)',
    description: 'Identifies underutilized rooms to audit room condition or pricing.',
    sql: `
      SELECT 
        r.room_no,
        r.room_type,
        r.price_per_night,
        r.capacity,
        r.availability
      FROM room r
      LEFT JOIN booking b ON r.hotel_id = b.hotel_id AND r.room_no = b.room_no
      WHERE b.booking_id IS NULL;
    `
  },
  {
    id: 6,
    title: 'Bookings Handled Per Front-Desk Staff',
    concept: 'LEFT JOIN, COUNT(), GROUP BY, ORDER BY',
    description: 'Measures front-desk staff productivity and workload distribution.',
    sql: `
      SELECT 
        e.emp_id,
        e.emp_name,
        e.role,
        COUNT(b.booking_id) AS total_bookings_handled
      FROM employee e
      LEFT JOIN booking b ON e.emp_id = b.emp_id
      GROUP BY e.emp_id, e.emp_name, e.role
      ORDER BY total_bookings_handled DESC;
    `
  },
  {
    id: 7,
    title: 'Real-Time Room Status Inventory Summary',
    concept: 'COUNT(), CASE expression, Subquery for Percentage',
    description: 'Instant overview of Available, Occupied, and Maintenance rooms.',
    sql: `
      SELECT 
        availability AS room_status,
        COUNT(*) AS count_of_rooms,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM room), 1) AS percentage_of_total
      FROM room
      GROUP BY availability;
    `
  },
  {
    id: 8,
    title: 'Payment Mode Popularity & Collection Share',
    concept: 'Aggregate SUM(), COUNT(), GROUP BY',
    description: 'Shows guest payment method preferences (UPI vs Card vs Cash vs Net Banking).',
    sql: `
      SELECT 
        payment_mode,
        COUNT(payment_id) AS transaction_count,
        SUM(amount) AS total_collected,
        ROUND(AVG(amount), 2) AS average_amount
      FROM payment
      WHERE status = 'Paid'
      GROUP BY payment_mode
      ORDER BY total_collected DESC;
    `
  },
  {
    id: 9,
    title: 'Average Length of Stay per Room Category',
    concept: 'AVG(), DATEDIFF, MIN(), MAX(), GROUP BY',
    description: 'Helps management forecast turnover and housekeeping cycles.',
    sql: `
      SELECT 
        r.room_type,
        COUNT(b.booking_id) AS total_stays,
        ROUND(AVG(DATEDIFF(b.check_out, b.check_in)), 1) AS avg_nights_stayed,
        MIN(DATEDIFF(b.check_out, b.check_in)) AS shortest_stay,
        MAX(DATEDIFF(b.check_out, b.check_in)) AS longest_stay
      FROM booking b
      JOIN room r ON b.hotel_id = r.hotel_id AND b.room_no = r.room_no
      WHERE b.status != 'Cancelled'
      GROUP BY r.room_type
      ORDER BY avg_nights_stayed DESC;
    `
  },
  {
    id: 10,
    title: 'Multi-Skilled Staff Roster',
    concept: 'GROUP_CONCAT, COUNT(), LEFT JOIN, GROUP BY',
    description: 'Lists employees with their count of specialized skills.',
    sql: `
      SELECT 
        e.emp_id,
        e.emp_name,
        e.role,
        COUNT(s.skill) AS skill_count,
        GROUP_CONCAT(s.skill ORDER BY s.skill SEPARATOR ', ') AS skill_list
      FROM employee e
      LEFT JOIN employee_skill s ON e.emp_id = s.emp_id
      GROUP BY e.emp_id, e.emp_name, e.role
      ORDER BY skill_count DESC;
    `
  }
];

// GET /api/reports - Runs all reports or a specific report (query param ?id=1)
router.get('/', async (req, res, next) => {
  try {
    const { id } = req.query;

    if (id) {
      const rep = REPORT_DEFINITIONS.find(r => r.id === parseInt(id, 10));
      if (!rep) {
        return res.status(404).json({ success: false, error: 'Report not found.' });
      }

      const [rows] = await pool.query(rep.sql);
      return res.json({
        success: true,
        report: {
          id: rep.id,
          title: rep.title,
          concept: rep.concept,
          description: rep.description,
          sql: rep.sql.trim(),
          data: rows
        }
      });
    }

    // Execute all reports sequentially
    const results = [];
    for (const rep of REPORT_DEFINITIONS) {
      const [rows] = await pool.query(rep.sql);
      results.push({
        id: rep.id,
        title: rep.title,
        concept: rep.concept,
        description: rep.description,
        sql: rep.sql.trim(),
        data: rows
      });
    }

    res.json({ success: true, count: results.length, reports: results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
