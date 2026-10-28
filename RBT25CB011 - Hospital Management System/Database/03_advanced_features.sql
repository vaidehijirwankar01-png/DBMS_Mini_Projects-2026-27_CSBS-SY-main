-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM - ADVANCED DBMS FEATURES
-- Step 3: Views, Stored Procedures, Functions, and Triggers
-- ============================================================================

USE hospital_db;

-- ============================================================================
-- 1. VIEWS (Data Abstraction & Security)
-- ============================================================================

-- View 1: Multi-Table Operational Overview for Reception & Clinic Staff
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

-- View 2: Comprehensive Patient Admission & Billing Summary
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


-- ============================================================================
-- 2. STORED PROCEDURES (Modular Business Logic & Collision Control)
-- ============================================================================

DROP PROCEDURE IF EXISTS sp_schedule_appointment;
DROP PROCEDURE IF EXISTS sp_assign_room;

DELIMITER //

-- Procedure 1: Safe appointment scheduling preventing double booking
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

-- Procedure 2: Atomic room assignment updating patient record and room occupancy
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


-- ============================================================================
-- 3. STORED FUNCTION (Deterministic Revenue Calculation)
-- ============================================================================

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


-- ============================================================================
-- 4. TRIGGER (Automated Audit Logging & Compliance)
-- ============================================================================

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
