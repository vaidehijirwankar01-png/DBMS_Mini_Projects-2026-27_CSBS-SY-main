-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM - DATABASE DEFINITION SCRIPT
-- DBMS College Project: MySQL 8 Feature Showcase
-- Includes: DDL, Constraints (CHECK, ENUM, FK), Triggers, Stored Procedures,
--           ACID Transactions, Handlers, Cursors, Stored Function, View, Sample Data
-- ============================================================================

DROP DATABASE IF EXISTS hospital_db;
CREATE DATABASE hospital_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hospital_db;

-- ----------------------------------------------------------------------------
-- 1. TABLES DEFINITION
-- ----------------------------------------------------------------------------

-- 1.1 Departments Table
CREATE TABLE departments (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 1.2 Doctors Table
CREATE TABLE doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    fee DECIMAL(10, 2) NOT NULL CHECK (fee >= 0),
    dept_id INT NULL,
    CONSTRAINT fk_doctor_dept FOREIGN KEY (dept_id)
        REFERENCES departments(dept_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 1.3 Patients Table
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL CHECK (age >= 0 AND age <= 120),
    gender ENUM('M', 'F', 'O') NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    address TEXT NULL
) ENGINE=InnoDB;

-- 1.4 Appointments Table
CREATE TABLE appointments (
    appt_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appt_date DATE NOT NULL,
    appt_time TIME NOT NULL,
    status ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
    CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id)
        REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctors(doctor_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 1.5 Billing Table
CREATE TABLE billing (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    appt_id INT NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_billing_appt FOREIGN KEY (appt_id)
        REFERENCES appointments(appt_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 1.6 Audit Log Table
CREATE TABLE audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 1.7 Doctor Report Table (Populated by Cursor procedure)
CREATE TABLE doctor_report (
    doctor_id INT PRIMARY KEY,
    doctor_name VARCHAR(100) NOT NULL,
    total_appts INT NOT NULL DEFAULT 0,
    revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. VIEW DEFINITION
-- ----------------------------------------------------------------------------
-- v_appointment_details: appointments INNER JOIN patients, INNER JOIN doctors,
--                         LEFT JOIN departments, LEFT JOIN billing
CREATE OR REPLACE VIEW v_appointment_details AS
SELECT 
    a.appt_id,
    a.appt_date,
    a.appt_time,
    a.status,
    p.patient_id,
    p.name AS patient_name,
    p.phone AS patient_phone,
    p.age AS patient_age,
    p.gender AS patient_gender,
    d.doctor_id,
    d.name AS doctor_name,
    d.specialization,
    d.fee AS doctor_fee,
    dept.dept_id,
    COALESCE(dept.dept_name, 'Unassigned') AS dept_name,
    b.bill_id,
    COALESCE(b.amount, 0.00) AS bill_amount,
    COALESCE(b.paid, FALSE) AS bill_paid
FROM appointments a
INNER JOIN patients p ON a.patient_id = p.patient_id
INNER JOIN doctors d ON a.doctor_id = d.doctor_id
LEFT JOIN departments dept ON d.dept_id = dept.dept_id
LEFT JOIN billing b ON a.appt_id = b.appt_id;

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS DEFINITION
-- ----------------------------------------------------------------------------

DELIMITER $$

-- Trigger 1: BEFORE INSERT on appointments
-- Block double-booking of same doctor, date and time using SIGNAL SQLSTATE '45000'
CREATE TRIGGER trg_check_double_booking
BEFORE INSERT ON appointments
FOR EACH ROW
BEGIN
    DECLARE v_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO v_exists
    FROM appointments
    WHERE doctor_id = NEW.doctor_id
      AND appt_date = NEW.appt_date
      AND appt_time = NEW.appt_time
      AND status != 'Cancelled';
      
    IF v_exists > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Double-booking error: Doctor already has an active appointment at this date and time.';
    END IF;
END$$

-- Trigger 2: AFTER INSERT on appointments
-- Automatically create bill using doctor's fee and write to audit_log
CREATE TRIGGER trg_create_bill_and_audit
AFTER INSERT ON appointments
FOR EACH ROW
BEGIN
    DECLARE v_doctor_fee DECIMAL(10, 2);
    
    SELECT fee INTO v_doctor_fee
    FROM doctors
    WHERE doctor_id = NEW.doctor_id;
    
    INSERT INTO billing (appt_id, amount, paid)
    VALUES (NEW.appt_id, IFNULL(v_doctor_fee, 0.00), FALSE);
    
    INSERT INTO audit_log (action)
    VALUES (CONCAT('New appointment booked: ID ', NEW.appt_id, ' for Patient #', NEW.patient_id, ' with Doctor #', NEW.doctor_id));
END$$

-- Trigger 3: AFTER UPDATE on appointments
-- When status changes to Cancelled, set bill amount to 0 and log it
CREATE TRIGGER trg_handle_cancellation
AFTER UPDATE ON appointments
FOR EACH ROW
BEGIN
    IF NEW.status = 'Cancelled' AND OLD.status != 'Cancelled' THEN
        UPDATE billing
        SET amount = 0.00
        WHERE appt_id = NEW.appt_id;
        
        INSERT INTO audit_log (action)
        VALUES (CONCAT('Appointment ID ', NEW.appt_id, ' cancelled; billing amount set to 0.00.'));
    ELSEIF NEW.status != OLD.status THEN
        INSERT INTO audit_log (action)
        VALUES (CONCAT('Appointment ID ', NEW.appt_id, ' status changed from ', OLD.status, ' to ', NEW.status));
    END IF;
END$$

-- Trigger 4: BEFORE DELETE on patients
-- Log deleted patient's name in audit_log
CREATE TRIGGER trg_patient_delete_audit
BEFORE DELETE ON patients
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (action)
    VALUES (CONCAT('Patient deleted: ', OLD.name, ' (ID: ', OLD.patient_id, ', Phone: ', OLD.phone, ')'));
END$$

-- ----------------------------------------------------------------------------
-- 4. STORED PROCEDURES AND FUNCTION DEFINITIONS
-- ----------------------------------------------------------------------------

-- Procedure 1: book_appointment
-- Uses START TRANSACTION / COMMIT, handles 45000, 1452, SQLEXCEPTION with ROLLBACK
CREATE PROCEDURE book_appointment(
    IN p_patient_id INT,
    IN p_doctor_id INT,
    IN p_appt_date DATE,
    IN p_appt_time TIME,
    OUT p_message VARCHAR(255)
)
proc_block: BEGIN
    DECLARE v_err_msg VARCHAR(255);

    -- Exception Handler for Custom Signal (Double booking or past date)
    DECLARE EXIT HANDLER FOR SQLSTATE '45000'
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1 v_err_msg = MESSAGE_TEXT;
        SET p_message = CONCAT('FAILED: ', v_err_msg);
    END;

    -- Exception Handler for Foreign Key violation (Code 1452)
    DECLARE EXIT HANDLER FOR 1452
    BEGIN
        ROLLBACK;
        SET p_message = 'FAILED: Invalid patient or doctor ID (Foreign key constraint violation).';
    END;

    -- Exception Handler for general database exceptions
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = 'FAILED: An unexpected database error occurred during appointment booking.';
    END;

    START TRANSACTION;

    -- Check if appointment date is in the past
    IF p_appt_date < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Appointment date cannot be in the past.';
    END IF;

    -- Insert the appointment (triggers trg_check_double_booking & trg_create_bill_and_audit)
    INSERT INTO appointments (patient_id, doctor_id, appt_date, appt_time, status)
    VALUES (p_patient_id, p_doctor_id, p_appt_date, p_appt_time, 'Scheduled');

    COMMIT;
    SET p_message = 'SUCCESS: Appointment booked successfully.';
END$$

-- Procedure 2: generate_doctor_report
-- Uses CURSOR with CONTINUE HANDLER FOR NOT FOUND, calculates count and revenue with JOIN,
-- inserts into doctor_report table and returns sorted results
CREATE PROCEDURE generate_doctor_report()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_doc_id INT;
    DECLARE v_doc_name VARCHAR(100);
    DECLARE v_total_appts INT;
    DECLARE v_revenue DECIMAL(10, 2);

    -- Cursor to iterate through each doctor
    DECLARE cur_doctor CURSOR FOR
        SELECT 
            d.doctor_id,
            d.name,
            COUNT(a.appt_id) AS total_appts,
            IFNULL(SUM(CASE WHEN a.status != 'Cancelled' THEN b.amount ELSE 0 END), 0.00) AS revenue
        FROM doctors d
        LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
        LEFT JOIN billing b ON a.appt_id = b.appt_id
        GROUP BY d.doctor_id, d.name;

    -- Handler to exit loop when cursor is exhausted
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Clear previous report data
    TRUNCATE TABLE doctor_report;

    OPEN cur_doctor;

    read_loop: LOOP
        FETCH cur_doctor INTO v_doc_id, v_doc_name, v_total_appts, v_revenue;
        IF done THEN
            LEAVE read_loop;
        END IF;

        INSERT INTO doctor_report (doctor_id, doctor_name, total_appts, revenue)
        VALUES (v_doc_id, v_doc_name, v_total_appts, v_revenue);
    END LOOP;

    CLOSE cur_doctor;

    -- Return the generated report sorted by revenue descending
    SELECT doctor_id, doctor_name, total_appts, revenue
    FROM doctor_report
    ORDER BY revenue DESC, total_appts DESC;
END$$

-- Function 1: patient_due
-- Returns the total unpaid bill amount for a given patient
CREATE FUNCTION patient_due(p_patient_id INT)
RETURNS DECIMAL(10, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_due DECIMAL(10, 2);
    
    SELECT IFNULL(SUM(b.amount), 0.00) INTO v_total_due
    FROM billing b
    INNER JOIN appointments a ON b.appt_id = a.appt_id
    WHERE a.patient_id = p_patient_id 
      AND b.paid = FALSE;
      
    RETURN v_total_due;
END$$

DELIMITER ;

-- ----------------------------------------------------------------------------
-- 5. SAMPLE SEED DATA
-- ----------------------------------------------------------------------------

-- 5.1 Departments (4 departments)
INSERT INTO departments (dept_id, dept_name) VALUES
(1, 'Cardiology'),
(2, 'Neurology'),
(3, 'Pediatrics'),
(4, 'Orthopedics');

-- 5.2 Doctors (4 doctors)
INSERT INTO doctors (doctor_id, name, specialization, fee, dept_id) VALUES
(1, 'Dr. Sarah Jenkins', 'Cardiologist', 150.00, 1),
(2, 'Dr. Rajesh Sharma', 'Neurologist', 200.00, 2),
(3, 'Dr. Emily Chen', 'Pediatrician', 120.00, 3),
(4, 'Dr. Michael Patel', 'Orthopedic Surgeon', 180.00, 4);

-- 5.3 Patients (3 patients)
INSERT INTO patients (patient_id, name, age, gender, phone, address) VALUES
(1, 'John Doe', 45, 'M', '555-0101', '742 Evergreen Terrace, Springfield'),
(2, 'Priya Nair', 32, 'F', '555-0102', '12 Rosewood Lane, Mumbai'),
(3, 'David Miller', 68, 'M', '555-0103', '88 Pinecrest Blvd, Austin');

-- 5.4 Book Appointments via the Procedure (Future dates as required)
CALL book_appointment(1, 1, '2026-10-15', '09:30:00', @msg1);
CALL book_appointment(2, 2, '2026-10-16', '11:00:00', @msg2);
CALL book_appointment(3, 3, '2026-10-17', '14:00:00', @msg3);

-- Initialize doctor report initial state
CALL generate_doctor_report();
