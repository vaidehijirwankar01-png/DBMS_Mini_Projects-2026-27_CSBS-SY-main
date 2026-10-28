-- =====================================================================
-- Hotel Management System - Seed Data (seed.sql)
-- Realistic Indian names, cities, phone numbers, Aadhaar numbers
-- 1 Hotel, 20 Rooms, 6 Employees + Skills, 10 Customers, 12 Bookings, Payments
-- =====================================================================

USE hotel_db;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 1. HOTEL (1 Hotel)
INSERT INTO hotel (hotel_id, hotel_name, city, state, address) VALUES
(1, 'The Royal Orchid Palace', 'Bengaluru', 'Karnataka', '45 Residency Road, Ashok Nagar, Bengaluru 560025');

-- 2. ROOMS (20 Rooms across Single, Double, Deluxe, Suite)
-- Single: 101-105 (Capacity 1, Price 1500.00)
-- Double: 201-205 (Capacity 2, Price 2500.00)
-- Deluxe: 301-305 (Capacity 3, Price 4200.00)
-- Suite:  401-405 (Capacity 4, Price 7500.00)
INSERT INTO room (hotel_id, room_no, room_type, price_per_night, capacity, availability) VALUES
(1, '101', 'Single', 1500.00, 1, 'Available'),
(1, '102', 'Single', 1500.00, 1, 'Occupied'),
(1, '103', 'Single', 1500.00, 1, 'Available'),
(1, '104', 'Single', 1500.00, 1, 'Maintenance'),
(1, '105', 'Single', 1500.00, 1, 'Available'),
(1, '201', 'Double', 2500.00, 2, 'Occupied'),
(1, '202', 'Double', 2500.00, 2, 'Available'),
(1, '203', 'Double', 2500.00, 2, 'Available'),
(1, '204', 'Double', 2500.00, 2, 'Occupied'),
(1, '205', 'Double', 2500.00, 2, 'Available'),
(1, '301', 'Deluxe', 4200.00, 3, 'Available'),
(1, '302', 'Deluxe', 4200.00, 3, 'Occupied'),
(1, '303', 'Deluxe', 4200.00, 3, 'Available'),
(1, '304', 'Deluxe', 4200.00, 3, 'Maintenance'),
(1, '305', 'Deluxe', 4200.00, 3, 'Available'),
(1, '401', 'Suite',  7500.00, 4, 'Occupied'),
(1, '402', 'Suite',  7500.00, 4, 'Available'),
(1, '403', 'Suite',  7500.00, 4, 'Available'),
(1, '404', 'Suite',  7500.00, 4, 'Available'),
(1, '405', 'Suite',  7500.00, 4, 'Available');

-- 3. EMPLOYEES (6 Employees)
INSERT INTO employee (emp_id, hotel_id, emp_name, phone_no, address, role) VALUES
(1, 1, 'Rajesh Sharma',    '9876543210', '12 Indiranagar, Bengaluru',       'Manager'),
(2, 1, 'Priya Nair',       '9845012345', '88 Koramangala, Bengaluru',       'Receptionist'),
(3, 1, 'Amitabh Sen',      '9811223344', '34 Whitefield, Bengaluru',        'Receptionist'),
(4, 1, 'Sunita Rao',       '9740112233', '15 Jayanagar, Bengaluru',         'Housekeeping'),
(5, 1, 'Chef Sanjeev Das', '9900554433', '77 Malleshwaram, Bengaluru',     'Chef'),
(6, 1, 'Vikram Singh',     '9822334455', '56 HSR Layout, Bengaluru',        'Security');

-- 4. EMPLOYEE SKILLS (Multivalued attribute table)
INSERT INTO employee_skill (emp_id, skill) VALUES
(1, 'Operations Management'),
(1, 'Financial Budgeting'),
(1, 'Conflict Resolution'),
(2, 'Front Desk Operations'),
(2, 'Customer Service'),
(2, 'Multi-language (English, Hindi, Kannada)'),
(3, 'Reservation Systems'),
(3, 'Guest Relations'),
(4, 'Deep Cleaning'),
(4, 'Inventory Control'),
(5, 'Continental Cuisine'),
(5, 'Food Safety & Hygiene'),
(5, 'Menu Planning'),
(6, 'Surveillance'),
(6, 'First Aid Certified'),
(6, 'Emergency Response');

-- 5. CUSTOMERS (10 Customers)
INSERT INTO customer (cust_id, cust_name, phone_no, email, aadhar_no, address) VALUES
(1,  'Rohan Verma',       '9810123456', 'rohan.verma@gmail.com',       '123456789012', 'B-14 Sector 62, Noida, UP'),
(2,  'Sneha Kulkarni',    '9820234567', 'sneha.kulkarni@yahoo.com',    '234567890123', '402 Shivaji Park, Mumbai, MH'),
(3,  'Arjun Iyer',        '9830345678', 'arjun.iyer@outlook.com',      '345678901234', '19 T. Nagar, Chennai, TN'),
(4,  'Kavita Reddy',      '9840456789', 'kavita.reddy@gmail.com',      '456789012345', '88 Banjara Hills, Hyderabad, TS'),
(5,  'Manish Gupta',      '9850567890', 'manish.gupta@rediffmail.com', '567890123456', '71 Civil Lines, Jaipur, RJ'),
(6,  'Deepika Menon',     '9860678901', 'deepika.menon@gmail.com',     '678901234567', '12 Panampilly Nagar, Kochi, KL'),
(7,  'Siddharth Joshi',   '9870789012', 'siddharth.j@gmail.com',       '789012345678', '9 Pune Satara Road, Pune, MH'),
(8,  'Pooja Bhattacharya','9880890123', 'pooja.b@gmail.com',           '890123456789', '44 Salt Lake, Kolkata, WB'),
(9,  'Nikhil Mehra',      '9890901234', 'nikhil.mehra@gmail.com',      '901234567890', '101 Model Town, Delhi'),
(10, 'Ananya Deshmukh',   '9701012345', 'ananya.d@gmail.com',          '912345678901', '62 Camp, Pune, MH');

-- 6. BOOKINGS (12 Bookings in mixed statuses)
-- Statuses: Checked-out (5), Checked-in (5), Booked (1), Cancelled (1)
INSERT INTO booking (booking_id, cust_id, hotel_id, room_no, emp_id, check_in, check_out, no_of_people, status) VALUES
-- Past checked-out bookings
(1,  1, 1, '101', 2, '2026-09-01', '2026-09-04', 1, 'Checked-out'), -- 3 nights * 1500 = 4500
(2,  2, 1, '202', 3, '2026-09-05', '2026-09-08', 2, 'Checked-out'), -- 3 nights * 2500 = 7500
(3,  3, 1, '301', 2, '2026-09-10', '2026-09-14', 3, 'Checked-out'), -- 4 nights * 4200 = 16800
(4,  4, 1, '402', 3, '2026-09-15', '2026-09-18', 4, 'Checked-out'), -- 3 nights * 7500 = 22500
(5,  5, 1, '203', 2, '2026-09-20', '2026-09-22', 2, 'Checked-out'), -- 2 nights * 2500 = 5000

-- Currently checked-in bookings (Rooms 102, 201, 204, 302, 401 are Occupied)
(6,  6, 1, '102', 2, '2026-10-10', '2026-10-14', 1, 'Checked-in'),  -- 4 nights * 1500 = 6000
(7,  7, 1, '201', 3, '2026-10-11', '2026-10-15', 2, 'Checked-in'),  -- 4 nights * 2500 = 10000
(8,  8, 1, '204', 2, '2026-10-11', '2026-10-13', 2, 'Checked-in'),  -- 2 nights * 2500 = 5000
(9,  9, 1, '302', 3, '2026-10-12', '2026-10-16', 3, 'Checked-in'),  -- 4 nights * 4200 = 16800
(10, 10,1, '401', 2, '2026-10-12', '2026-10-15', 4, 'Checked-in'),  -- 3 nights * 7500 = 22500

-- Future Booked reservation
(11, 1, 1, '303', 2, '2026-10-20', '2026-10-23', 2, 'Booked'),      -- 3 nights * 4200 = 12600

-- Cancelled booking
(12, 5, 1, '205', 3, '2026-10-01', '2026-10-03', 2, 'Cancelled');   -- 2 nights * 2500 = 5000

-- 7. PAYMENTS
-- Note: Checked-out bookings must be fully paid.
-- Checked-in bookings may be partial or full.
INSERT INTO payment (payment_id, booking_id, amount, payment_mode, payment_date, transaction_ref, status) VALUES
-- Fully paid for checked-out bookings
(1,  1, 4500.00,  'UPI',         '2026-09-01', 'TXN-UPI-009101', 'Paid'),
(2,  2, 7500.00,  'Card',        '2026-09-05', 'TXN-CRD-009202', 'Paid'),
(3,  3, 16800.00, 'Net Banking', '2026-09-10', 'TXN-NET-009301', 'Paid'),
(4,  4, 22500.00, 'Card',        '2026-09-15', 'TXN-CRD-009402', 'Paid'),
(5,  5, 5000.00,  'Cash',        '2026-09-20', 'TXN-CSH-009203', 'Paid'),

-- Checked-in payments (some full, some partial to demonstrate balance due)
(6,  6, 3000.00,  'UPI',         '2026-10-10', 'TXN-UPI-010102', 'Paid'), -- 3000 of 6000 paid (50% partial)
(7,  7, 10000.00, 'UPI',         '2026-10-11', 'TXN-UPI-010201', 'Paid'), -- 10000 of 10000 paid (full)
(8,  8, 2500.00,  'Cash',        '2026-10-11', 'TXN-CSH-010204', 'Paid'), -- 2500 of 5000 paid (partial)
(9,  9, 10000.00, 'Card',        '2026-10-12', 'TXN-CRD-010302', 'Paid'), -- 10000 of 16800 paid (partial)
(10, 10,22500.00, 'Net Banking', '2026-10-12', 'TXN-NET-010401', 'Paid'), -- 22500 of 22500 paid (full)

-- Advance payment for future booking 11
(11, 11, 5000.00, 'UPI',         '2026-10-12', 'TXN-UPI-010303', 'Paid'); -- 5000 advance
