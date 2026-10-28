-- =====================================================================
-- Hotel Management System - Database Schema (schema.sql)
-- Tech: MySQL 8.0, InnoDB, utf8mb4
-- Description: Drops and recreates hotel_db with 3NF normalized tables,
--              sensible constraints, foreign keys, and views.
-- =====================================================================

DROP DATABASE IF EXISTS hotel_db;
CREATE DATABASE hotel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE hotel_db;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- Table: hotel
-- Entity: HOTEL (1:N with room, 1:N with employee)
-- ---------------------------------------------------------------------
CREATE TABLE hotel (
    hotel_id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_name VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: room
-- Entity: ROOM (Weak entity of HOTEL, identifying relationship "has")
-- Composite Primary Key: (hotel_id, room_no)
-- ---------------------------------------------------------------------
CREATE TABLE room (
    hotel_id INT NOT NULL,
    room_no VARCHAR(10) NOT NULL,
    room_type ENUM('Single', 'Double', 'Deluxe', 'Suite') NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL CHECK (price_per_night > 0),
    capacity INT NOT NULL CHECK (capacity > 0),
    availability ENUM('Available', 'Occupied', 'Maintenance') NOT NULL DEFAULT 'Available',
    PRIMARY KEY (hotel_id, room_no),
    FOREIGN KEY (hotel_id) REFERENCES hotel(hotel_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: employee
-- Entity: EMPLOYEE (Relationship: HOTEL 1:N EMPLOYEE "employs")
-- ---------------------------------------------------------------------
CREATE TABLE employee (
    emp_id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    emp_name VARCHAR(100) NOT NULL,
    phone_no VARCHAR(15) NOT NULL,
    address VARCHAR(255) NOT NULL,
    role ENUM('Manager', 'Receptionist', 'Housekeeping', 'Chef', 'Security') NOT NULL,
    FOREIGN KEY (hotel_id) REFERENCES hotel(hotel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_employee_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: employee_skill
-- Multivalued attribute 'skills' of EMPLOYEE
-- Composite Primary Key: (emp_id, skill)
-- ---------------------------------------------------------------------
CREATE TABLE employee_skill (
    emp_id INT NOT NULL,
    skill VARCHAR(50) NOT NULL,
    PRIMARY KEY (emp_id, skill),
    FOREIGN KEY (emp_id) REFERENCES employee(emp_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: customer
-- Entity: CUSTOMER (Relationship: CUSTOMER 1:N BOOKING "makes")
-- ---------------------------------------------------------------------
CREATE TABLE customer (
    cust_id INT AUTO_INCREMENT PRIMARY KEY,
    cust_name VARCHAR(100) NOT NULL,
    phone_no VARCHAR(15) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    aadhar_no CHAR(12) NOT NULL UNIQUE,
    address VARCHAR(255) NOT NULL,
    INDEX idx_customer_name (cust_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: booking
-- Entity: BOOKING (Relationships:
--   CUSTOMER 1:N BOOKING "makes",
--   ROOM 1:N BOOKING "reserved for",
--   EMPLOYEE 1:N BOOKING "handles" (the receptionist))
-- Note: total_amount is a DERIVED attribute and NOT stored here.
-- ---------------------------------------------------------------------
CREATE TABLE booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    cust_id INT NOT NULL,
    hotel_id INT NOT NULL,
    room_no VARCHAR(10) NOT NULL,
    emp_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    no_of_people INT NOT NULL CHECK (no_of_people > 0),
    status ENUM('Booked', 'Checked-in', 'Checked-out', 'Cancelled') NOT NULL DEFAULT 'Booked',
    CONSTRAINT chk_booking_dates CHECK (check_out > check_in),
    FOREIGN KEY (cust_id) REFERENCES customer(cust_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (hotel_id, room_no) REFERENCES room(hotel_id, room_no) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (emp_id) REFERENCES employee(emp_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_booking_dates (check_in, check_out),
    INDEX idx_booking_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table: payment
-- Entity: PAYMENT (Relationship: BOOKING 1:N PAYMENT "paid by")
-- ---------------------------------------------------------------------
CREATE TABLE payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_mode ENUM('Cash', 'UPI', 'Card', 'Net Banking') NOT NULL,
    payment_date DATE NOT NULL,
    transaction_ref VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('Paid', 'Pending', 'Refunded') NOT NULL DEFAULT 'Paid',
    FOREIGN KEY (booking_id) REFERENCES booking(booking_id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_payment_booking (booking_id),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- VIEWS
-- =====================================================================

-- 1. v_room_availability: Quick overview of all rooms and their status
CREATE OR REPLACE VIEW v_room_availability AS
SELECT 
    r.hotel_id,
    h.hotel_name,
    r.room_no,
    r.room_type,
    r.price_per_night,
    r.capacity,
    r.availability
FROM room r
JOIN hotel h ON r.hotel_id = h.hotel_id;

-- 2. v_booking_details: Detailed booking info joined with customer, room, and employee
CREATE OR REPLACE VIEW v_booking_details AS
SELECT 
    b.booking_id,
    b.cust_id,
    c.cust_name,
    c.phone_no AS customer_phone,
    c.email AS customer_email,
    b.hotel_id,
    h.hotel_name,
    b.room_no,
    r.room_type,
    r.price_per_night,
    b.emp_id,
    e.emp_name AS receptionist_name,
    b.check_in,
    b.check_out,
    DATEDIFF(b.check_out, b.check_in) AS nights,
    b.no_of_people,
    b.status AS booking_status
FROM booking b
JOIN customer c ON b.cust_id = c.cust_id
JOIN room r ON b.hotel_id = r.hotel_id AND b.room_no = r.room_no
JOIN hotel h ON b.hotel_id = h.hotel_id
JOIN employee e ON b.emp_id = e.emp_id;

-- 3. v_booking_bill: Calculates derived total_amount, total_paid, and balance_due
CREATE OR REPLACE VIEW v_booking_bill AS
SELECT 
    b.booking_id,
    b.cust_id,
    c.cust_name,
    b.hotel_id,
    b.room_no,
    r.room_type,
    b.check_in,
    b.check_out,
    b.status AS booking_status,
    DATEDIFF(b.check_out, b.check_in) AS nights,
    r.price_per_night,
    CAST(DATEDIFF(b.check_out, b.check_in) * r.price_per_night AS DECIMAL(10,2)) AS room_charges,
    COALESCE(p.total_paid, 0.00) AS total_paid,
    CAST(
        (DATEDIFF(b.check_out, b.check_in) * r.price_per_night) - COALESCE(p.total_paid, 0.00) 
        AS DECIMAL(10,2)
    ) AS balance_due
FROM booking b
JOIN customer c ON b.cust_id = c.cust_id
JOIN room r ON b.hotel_id = r.hotel_id AND b.room_no = r.room_no
LEFT JOIN (
    SELECT booking_id, SUM(amount) AS total_paid
    FROM payment
    WHERE status = 'Paid'
    GROUP BY booking_id
) p ON b.booking_id = p.booking_id;
