-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM - ALL-IN-ONE MASTER DEPLOYMENT SCRIPT
-- Executes: Schema DDL -> Demonstration Seed Data -> Advanced DBMS Features
-- Engine: InnoDB (MySQL 8.0+ / Cloud SQL / MySQL Workbench)
-- ============================================================================

-- STEP 1: CREATE DATABASE AND SCHEMA
CREATE DATABASE IF NOT EXISTS hospital_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE hospital_db;

-- Drop dependent tables in reverse FK dependency order
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS bill;
DROP TABLE IF EXISTS appointment;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS room;
DROP TABLE IF EXISTS doctor;
DROP TABLE IF EXISTS department;
DROP TABLE IF EXISTS users;

-- 1. SUPPORTING USERS TABLE
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Staff') NOT NULL DEFAULT 'Staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. CORE ENTITY: DEPARTMENT
CREATE TABLE department (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    floor INT NOT NULL CHECK (floor >= 0),
    hod VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- 3. CORE ENTITY: DOCTOR
CREATE TABLE doctor (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    phone_no VARCHAR(15) NOT NULL UNIQUE,
    salary DECIMAL(10,2) NOT NULL CHECK (salary > 0),
    experience INT NOT NULL CHECK (experience >= 0),
    department_id INT NOT NULL,
    CONSTRAINT fk_doctor_department 
        FOREIGN KEY (department_id) REFERENCES department(department_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. CORE ENTITY: ROOM
CREATE TABLE room (
    room_no INT PRIMARY KEY,
    room_type ENUM('General', 'Semi-Private', 'Private', 'ICU') NOT NULL,
    charges DECIMAL(10,2) NOT NULL CHECK (charges >= 0),
    availability ENUM('Available', 'Occupied', 'Maintenance') NOT NULL DEFAULT 'Available'
) ENGINE=InnoDB;

-- 5. CORE ENTITY: PATIENT
CREATE TABLE patient (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL CHECK (age BETWEEN 0 AND 120),
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    phone_no VARCHAR(15) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    room_no INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_patient_room 
        FOREIGN KEY (room_no) REFERENCES room(room_no) 
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6. CORE ENTITY: APPOINTMENT
CREATE TABLE appointment (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    status ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointment_patient 
        FOREIGN KEY (patient_id) REFERENCES patient(patient_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_appointment_doctor 
        FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_doctor_time_slot UNIQUE (doctor_id, date, time)
) ENGINE=InnoDB;

-- 7. CORE ENTITY: BILL
CREATE TABLE bill (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_mode ENUM('Cash', 'Card', 'UPI', 'Insurance', 'Pending') NOT NULL DEFAULT 'Pending',
    payment_status ENUM('Paid', 'Pending', 'Partially Paid') NOT NULL DEFAULT 'Pending',
    date DATE NOT NULL,
    CONSTRAINT fk_bill_patient 
        FOREIGN KEY (patient_id) REFERENCES patient(patient_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 8. AUDIT LOG TABLE
CREATE TABLE audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    record_id INT NOT NULL,
    details TEXT NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- PERFORMANCE INDEXES
CREATE INDEX idx_appointment_date ON appointment(date);
CREATE INDEX idx_appointment_doc_status ON appointment(doctor_id, status);
CREATE INDEX idx_patient_phone ON patient(phone_no);
CREATE INDEX idx_room_availability ON room(availability);


-- ============================================================================
-- STEP 2: LOAD DEMONSTRATION SEED DATA
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_log;
TRUNCATE TABLE bill;
TRUNCATE TABLE appointment;
TRUNCATE TABLE patient;
TRUNCATE TABLE room;
TRUNCATE TABLE doctor;
TRUNCATE TABLE department;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Users
INSERT INTO users (username, password_hash, role) VALUES
('admin', 'scrypt:32768:8:1$uB8Q4J9L1X$a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890', 'Admin'),
('receptionist', 'scrypt:32768:8:1$uB8Q4J9L1X$a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890', 'Staff');

-- Departments
INSERT INTO department (department_id, department_name, floor, hod) VALUES
(1, 'Cardiology', 3, 'Dr. Rajesh Sharma'),
(2, 'Neurology', 4, 'Dr. Sunita Deshmukh'),
(3, 'Orthopedics', 2, 'Dr. Anil Kulkarni'),
(4, 'Pediatrics', 1, 'Dr. Meera Patil'),
(5, 'General Medicine', 1, 'Dr. Vikram Joshi');

-- Doctors
INSERT INTO doctor (doctor_id, name, specialization, phone_no, salary, experience, department_id) VALUES
(1, 'Dr. Rajesh Sharma', 'Interventional Cardiology', '9822011101', 185000.00, 15, 1),
(2, 'Dr. Priya Nair', 'Electrophysiology', '9822011102', 140000.00, 8, 1),
(3, 'Dr. Sunita Deshmukh', 'Neurosurgeon', '9822011103', 210000.00, 18, 2),
(4, 'Dr. Amit Shah', 'Neurologist', '9822011104', 135000.00, 7, 2),
(5, 'Dr. Anil Kulkarni', 'Orthopedic Surgeon', '9822011105', 160000.00, 12, 3),
(6, 'Dr. Sneha Roy', 'Pediatrician', '9822011106', 115000.00, 6, 4),
(7, 'Dr. Meera Patil', 'Pediatric Cardiology', '9822011107', 150000.00, 10, 4),
(8, 'Dr. Vikram Joshi', 'General Physician', '9822011108', 125000.00, 9, 5);

-- Rooms
INSERT INTO room (room_no, room_type, charges, availability) VALUES
(101, 'General', 1200.00, 'Occupied'),
(102, 'General', 1200.00, 'Available'),
(103, 'General', 1200.00, 'Available'),
(201, 'Semi-Private', 2500.00, 'Occupied'),
(202, 'Semi-Private', 2500.00, 'Occupied'),
(301, 'Private', 5000.00, 'Occupied'),
(302, 'Private', 5000.00, 'Available'),
(401, 'ICU', 10000.00, 'Occupied'),
(402, 'ICU', 10000.00, 'Occupied'),
(403, 'ICU', 10000.00, 'Maintenance');

-- Patients
INSERT INTO patient (patient_id, name, age, gender, phone_no, address, room_no) VALUES
(1, 'Ramesh Pawar', 45, 'Male', '9765012301', 'Kothrud, Pune', 101),
(2, 'Sita Verma', 32, 'Female', '9765012302', 'Viman Nagar, Pune', NULL),
(3, 'Aarav Gupta', 8, 'Male', '9765012303', 'Aundh, Pune', NULL),
(4, 'Sunita Rao', 58, 'Female', '9765012304', 'Baner, Pune', 201),
(5, 'Vijay Kale', 62, 'Male', '9765012305', 'Tathawade, Pune', 401),
(6, 'Pooja Mehta', 27, 'Female', '9765012306', 'Wakad, Pune', NULL),
(7, 'Ganesh Shinde', 51, 'Male', '9765012307', 'Hinjewadi, Pune', 202),
(8, 'Kavita Jadhav', 39, 'Female', '9765012308', 'Pimple Saudagar, Pune', NULL),
(9, 'Rahul Dravid', 48, 'Male', '9765012309', 'Shivajinagar, Pune', 301),
(10, 'Ananya Birje', 22, 'Female', '9765012310', 'Hadapsar, Pune', NULL),
(11, 'Suresh Gadgil', 70, 'Male', '9765012311', 'Pashan, Pune', 402),
(12, 'Neha Agarwal', 34, 'Female', '9765012312', 'Kharadi, Pune', NULL),
(13, 'Manoj Tiwari', 41, 'Male', '9765012313', 'Bavdhan, Pune', NULL),
(14, 'Swati Kadam', 29, 'Female', '9765012314', 'Chinchwad, Pune', NULL),
(15, 'Prakash More', 66, 'Male', '9765012315', 'Nigdi, Pune', NULL);

-- Appointments
INSERT INTO appointment (appointment_id, patient_id, doctor_id, date, time, status) VALUES
(1, 1, 1, '2026-10-20', '10:00:00', 'Completed'),
(2, 2, 2, '2026-10-20', '11:00:00', 'Completed'),
(3, 3, 6, '2026-10-21', '09:30:00', 'Completed'),
(4, 4, 3, '2026-10-21', '10:30:00', 'Completed'),
(5, 5, 1, '2026-10-21', '12:00:00', 'Scheduled'),
(6, 6, 8, '2026-10-22', '10:00:00', 'Scheduled'),
(7, 7, 5, '2026-10-22', '11:30:00', 'Scheduled'),
(8, 8, 4, '2026-10-22', '14:00:00', 'Scheduled'),
(9, 9, 3, '2026-10-23', '09:00:00', 'Scheduled'),
(10, 10, 8, '2026-10-23', '10:30:00', 'Scheduled'),
(11, 11, 1, '2026-10-23', '11:30:00', 'Scheduled'),
(12, 12, 7, '2026-10-24', '10:00:00', 'Cancelled'),
(13, 13, 5, '2026-10-24', '11:00:00', 'Scheduled'),
(14, 14, 2, '2026-10-25', '15:00:00', 'Scheduled'),
(15, 15, 8, '2026-10-25', '16:00:00', 'Scheduled');

-- Bills
INSERT INTO bill (bill_id, patient_id, amount, payment_mode, payment_status, date) VALUES
(1, 1, 4700.00, 'UPI', 'Paid', '2026-10-20'),
(2, 2, 800.00, 'Cash', 'Paid', '2026-10-20'),
(3, 3, 600.00, 'Card', 'Paid', '2026-10-21'),
(4, 4, 12500.00, 'Insurance', 'Partially Paid', '2026-10-21'),
(5, 5, 35000.00, 'Pending', 'Pending', '2026-10-21'),
(6, 6, 750.00, 'Pending', 'Pending', '2026-10-22'),
(7, 7, 8500.00, 'UPI', 'Paid', '2026-10-22'),
(8, 8, 1200.00, 'Pending', 'Pending', '2026-10-22'),
(9, 9, 22000.00, 'Card', 'Paid', '2026-10-23'),
(10, 10, 500.00, 'UPI', 'Paid', '2026-10-23'),
(11, 11, 42000.00, 'Pending', 'Pending', '2026-10-23'),
(12, 12, 0.00, 'Pending', 'Pending', '2026-10-24'),
(13, 13, 1500.00, 'Cash', 'Paid', '2026-10-24'),
(14, 14, 900.00, 'Pending', 'Pending', '2026-10-25'),
(15, 15, 750.00, 'Pending', 'Pending', '2026-10-25');


-- ============================================================================
-- STEP 3: ADVANCED DBMS FEATURES (Views, Procedures, Functions, Triggers)
-- ============================================================================

-- Views
CREATE OR REPLACE VIEW v_appointment_overview AS
SELECT 
    a.appointment_id,
    a.date,
    a.time,
    a.status,
    p.patient_id,
    p.name AS patient_name,
    p.phone_no AS patient_phone,
    d.doctor_id,
    d.name AS doctor_name,
    dept.department_name
FROM appointment a
JOIN patient p ON a.patient_id = p.patient_id
JOIN doctor d ON a.doctor_id = d.doctor_id
JOIN department dept ON d.department_id = dept.department_id;

CREATE OR REPLACE VIEW v_patient_billing_summary AS
SELECT 
    p.patient_id,
    p.name AS patient_name,
    p.phone_no,
    r.room_no,
    r.room_type,
    IFNULL(r.charges, 0.00) AS daily_room_charges,
    b.bill_id,
    IFNULL(b.amount, 0.00) AS total_bill_amount,
    IFNULL(b.payment_status, 'Unbilled') AS payment_status,
    IFNULL(b.payment_mode, 'Pending') AS payment_mode
FROM patient p
LEFT JOIN room r ON p.room_no = r.room_no
LEFT JOIN bill b ON p.patient_id = b.patient_id;

-- Stored Procedures
DROP PROCEDURE IF EXISTS sp_schedule_appointment;
DROP PROCEDURE IF EXISTS sp_assign_room;

DELIMITER //

CREATE PROCEDURE sp_schedule_appointment(
    IN p_patient_id INT,
    IN p_doctor_id INT,
    IN p_date DATE,
    IN p_time TIME,
    OUT p_status_msg VARCHAR(255)
)
BEGIN
    DECLARE v_conflict_count INT;
    
    SELECT COUNT(*) INTO v_conflict_count
    FROM appointment
    WHERE doctor_id = p_doctor_id 
      AND date = p_date 
      AND time = p_time
      AND status != 'Cancelled';
      
    IF v_conflict_count > 0 THEN
        SET p_status_msg = 'ERROR: Doctor is already booked for this date and time slot.';
    ELSE
        INSERT INTO appointment (patient_id, doctor_id, date, time, status)
        VALUES (p_patient_id, p_doctor_id, p_date, p_time, 'Scheduled');
        SET p_status_msg = 'SUCCESS: Appointment scheduled successfully.';
    END IF;
END //

CREATE PROCEDURE sp_assign_room(
    IN p_patient_id INT,
    IN p_room_no INT,
    OUT p_result VARCHAR(255)
)
BEGIN
    DECLARE v_room_status VARCHAR(20);
    
    SELECT availability INTO v_room_status FROM room WHERE room_no = p_room_no;
    
    IF v_room_status IS NULL THEN
        SET p_result = 'ERROR: Room number does not exist.';
    ELSEIF v_room_status != 'Available' THEN
        SET p_result = 'ERROR: Selected room is not available.';
    ELSE
        UPDATE patient SET room_no = p_room_no WHERE patient_id = p_patient_id;
        UPDATE room SET availability = 'Occupied' WHERE room_no = p_room_no;
        SET p_result = 'SUCCESS: Room assigned and status updated to Occupied.';
    END IF;
END //

DELIMITER ;

-- Stored Function
DROP FUNCTION IF EXISTS fn_get_department_total_revenue;

DELIMITER //

CREATE FUNCTION fn_get_department_total_revenue(p_dept_id INT) 
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(10,2);
    
    SELECT IFNULL(SUM(b.amount), 0.00) INTO v_total
    FROM bill b
    JOIN patient p ON b.patient_id = p.patient_id
    JOIN appointment a ON p.patient_id = a.patient_id
    JOIN doctor d ON a.doctor_id = d.doctor_id
    WHERE d.department_id = p_dept_id AND b.payment_status = 'Paid';
    
    RETURN v_total;
END //

DELIMITER ;

-- Trigger
DROP TRIGGER IF EXISTS trg_after_bill_payment_update;

DELIMITER //

CREATE TRIGGER trg_after_bill_payment_update
AFTER UPDATE ON bill
FOR EACH ROW
BEGIN
    IF OLD.payment_status <> NEW.payment_status THEN
        INSERT INTO audit_log (table_name, action_type, record_id, details)
        VALUES (
            'bill', 
            'UPDATE', 
            NEW.bill_id, 
            CONCAT('Payment status changed from ', OLD.payment_status, ' to ', NEW.payment_status, ' (Amount: ₹', NEW.amount, ')')
        );
    END IF;
END //

DELIMITER ;

-- ============================================================================
-- VERIFICATION CONFIRMATION
-- ============================================================================
SELECT 'hospital_db initialization complete!' AS status,
       (SELECT COUNT(*) FROM department) AS departments,
       (SELECT COUNT(*) FROM doctor) AS doctors,
       (SELECT COUNT(*) FROM room) AS rooms,
       (SELECT COUNT(*) FROM patient) AS patients,
       (SELECT COUNT(*) FROM appointment) AS appointments,
       (SELECT COUNT(*) FROM bill) AS bills;
