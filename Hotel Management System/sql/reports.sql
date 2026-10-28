-- =====================================================================
-- Hotel Management System - Analytical & Viva Report Queries (reports.sql)
-- DBMS Mini Project: 10 Queries demonstrating Group By, Joins,
-- Subqueries, Aggregate Functions, and Having Clauses.
-- =====================================================================

USE hotel_db;

-- ---------------------------------------------------------------------
-- Query 1: Monthly Revenue Breakdown
-- Purpose: Aggregates revenue received month-by-month for accounting reports.
-- SQL Concepts: DATE_FORMAT, SUM(), GROUP BY, ORDER BY
-- ---------------------------------------------------------------------
SELECT 
    DATE_FORMAT(payment_date, '%Y-%m') AS month,
    COUNT(payment_id) AS total_transactions,
    SUM(amount) AS total_revenue,
    ROUND(AVG(amount), 2) AS average_transaction_amount
FROM payment
WHERE status = 'Paid'
GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
ORDER BY month DESC;

-- ---------------------------------------------------------------------
-- Query 2: Room Occupancy & Revenue by Room Type
-- Purpose: Analyzes which room category generates the most booking volume and income.
-- SQL Concepts: JOIN, COUNT(), SUM(), GROUP BY
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Query 3: Top High-Value Customers (Revenue >= 10,000)
-- Purpose: Identifies VIP guests for loyalty rewards and discount promotions.
-- SQL Concepts: JOIN across 3 tables, SUM(), GROUP BY, HAVING, ORDER BY
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Query 4: Unpaid Balances for Active & Booked Reservations
-- Purpose: Displays guests with pending balances to prompt front-desk collection.
-- SQL Concepts: Querying a calculated View, WHERE filter, ORDER BY
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Query 5: Rooms That Have Never Been Booked
-- Purpose: Identifies underutilized rooms to audit room condition or pricing.
-- SQL Concepts: LEFT JOIN, IS NULL check (or Correlated NOT EXISTS subquery)
-- ---------------------------------------------------------------------
SELECT 
    r.room_no,
    r.room_type,
    r.price_per_night,
    r.capacity,
    r.availability
FROM room r
LEFT JOIN booking b ON r.hotel_id = b.hotel_id AND r.room_no = b.room_no
WHERE b.booking_id IS NULL;

-- ---------------------------------------------------------------------
-- Query 6: Bookings Handled Per Front-Desk Employee
-- Purpose: Measures front-desk staff productivity and workload distribution.
-- SQL Concepts: JOIN, COUNT(), GROUP BY, ORDER BY
-- ---------------------------------------------------------------------
SELECT 
    e.emp_id,
    e.emp_name,
    e.role,
    COUNT(b.booking_id) AS total_bookings_handled
FROM employee e
LEFT JOIN booking b ON e.emp_id = b.emp_id
GROUP BY e.emp_id, e.emp_name, e.role
ORDER BY total_bookings_handled DESC;

-- ---------------------------------------------------------------------
-- Query 7: Real-Time Room Status Inventory Summary
-- Purpose: Gives hotel manager an instant count of Available, Occupied, and Maintenance rooms.
-- SQL Concepts: Aggregate COUNT(), CASE Statements, Summary row
-- ---------------------------------------------------------------------
SELECT 
    availability AS room_status,
    COUNT(*) AS count_of_rooms,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM room), 1) AS percentage_of_total
FROM room
GROUP BY availability;

-- ---------------------------------------------------------------------
-- Query 8: Payment Mode Popularity & Collection Share
-- Purpose: Shows guest payment method preferences (UPI vs Card vs Cash vs Net Banking).
-- SQL Concepts: Aggregate SUM(), COUNT(), GROUP BY
-- ---------------------------------------------------------------------
SELECT 
    payment_mode,
    COUNT(payment_id) AS transaction_count,
    SUM(amount) AS total_collected,
    ROUND(AVG(amount), 2) AS average_amount
FROM payment
WHERE status = 'Paid'
GROUP BY payment_mode
ORDER BY total_collected DESC;

-- ---------------------------------------------------------------------
-- Query 9: Average Length of Stay per Room Category
-- Purpose: Helps management forecast turnover and housekeeping cycles.
-- SQL Concepts: AVG(), DATEDIFF, GROUP BY, ROUND
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Query 10: Multi-Skilled Staff Roster
-- Purpose: Lists employees with their count of specialized skills.
-- SQL Concepts: GROUP_CONCAT, COUNT, JOIN, GROUP BY
-- ---------------------------------------------------------------------
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
