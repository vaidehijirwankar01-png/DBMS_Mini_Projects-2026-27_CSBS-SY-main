-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM - VIVA DEMONSTRATION & VERIFICATION QUERIES
-- Step 4: Workbench Viva Voce Commands, Integrity Tests, and ACID Demonstrations
-- ============================================================================

USE hospital_db;

-- ============================================================================
-- PART 1: VERIFY ALL 6 CORE ENTITIES & SUPPORTING TABLES
-- ============================================================================
SELECT '--- 1. Department Records ---' AS Section;
SELECT * FROM department;

SELECT '--- 2. Doctor Records ---' AS Section;
SELECT * FROM doctor;

SELECT '--- 3. Room Inventory & Availability ---' AS Section;
SELECT * FROM room;

SELECT '--- 4. Patient Registry ---' AS Section;
SELECT * FROM patient;

SELECT '--- 5. Appointment Schedule ---' AS Section;
SELECT * FROM appointment;

SELECT '--- 6. Billing Records ---' AS Section;
SELECT * FROM bill;

SELECT '--- 7. System Users ---' AS Section;
SELECT user_id, username, role, created_at FROM users;


-- ============================================================================
-- PART 2: MULTI-TABLE RELATIONAL VIEWS
-- ============================================================================
-- View 1: 4-Table JOIN (Appointment, Patient, Doctor, Department)
SELECT '--- View: Appointment Overview ---' AS Section;
SELECT * FROM v_appointment_overview;

-- View 2: 3-Table LEFT JOIN (Patient, Room, Bill)
SELECT '--- View: Patient Billing Summary ---' AS Section;
SELECT * FROM v_patient_billing_summary;


-- ============================================================================
-- PART 3: STORED PROCEDURE DEMONSTRATION (Collision Detection & Atomic Assign)
-- ============================================================================
SELECT '--- Stored Procedure: Scheduling Test 1 (Collision Conflict) ---' AS Section;
-- Test 1: Expect ERROR because Doctor 1 is already booked on 2026-10-21 at 12:00:00
CALL sp_schedule_appointment(1, 1, '2026-10-21', '12:00:00', @msg1);
SELECT @msg1 AS collision_test_result;

SELECT '--- Stored Procedure: Scheduling Test 2 (Available Slot) ---' AS Section;
-- Test 2: Expect SUCCESS because the doctor has no appointment on this date & time
CALL sp_schedule_appointment(1, 1, '2026-10-30', '10:00:00', @msg2);
SELECT @msg2 AS success_test_result;

-- Verify the new appointment was added
SELECT * FROM appointment WHERE patient_id = 1 AND date = '2026-10-30';

SELECT '--- Stored Procedure: Room Assignment Test ---' AS Section;
-- Test 3: Assign available room 102 to patient 2 (who currently has no room)
CALL sp_assign_room(2, 102, @room_msg);
SELECT @room_msg AS room_assignment_result;

-- Verify patient room assignment and room status transition to 'Occupied'
SELECT patient_id, name, room_no FROM patient WHERE patient_id = 2;
SELECT room_no, room_type, availability FROM room WHERE room_no = 102;


-- ============================================================================
-- PART 4: TRIGGER & AUDIT TRAIL VERIFICATION
-- ============================================================================
SELECT '--- Trigger Test: Updating Bill Payment Status ---' AS Section;
-- Before update: Check bill 5
SELECT * FROM bill WHERE bill_id = 5;

-- Update bill 5 status from 'Pending' to 'Paid' (triggers trg_after_bill_payment_update)
UPDATE bill SET payment_status = 'Paid', payment_mode = 'Card' WHERE bill_id = 5;

-- Check audit_log to see automated record created by the trigger
SELECT '--- Audit Log Table Output ---' AS Section;
SELECT * FROM audit_log;


-- ============================================================================
-- PART 5: STORED FUNCTION DEMONSTRATION (Revenue Calculation)
-- ============================================================================
SELECT '--- Stored Function: Department Total Revenue ---' AS Section;
-- Calculates total paid bill amount for Cardiology (dept_id = 1)
-- Cardiology now includes Bill 1 (4,700), Bill 2 (800), and Bill 5 (35,000) = 40,500.00
SELECT 
    d.department_name,
    fn_get_department_total_revenue(d.department_id) AS total_revenue_inr
FROM department d
WHERE d.department_id = 1;


-- ============================================================================
-- PART 6: ADVANCED SQL QUERIES (Aggregations, Subqueries, & Analytics)
-- ============================================================================
SELECT '--- Analytics 1: Doctor Workload & Completed Consultations ---' AS Section;
SELECT 
    d.doctor_id,
    d.name AS doctor_name,
    dept.department_name,
    COUNT(a.appointment_id) AS total_appointments,
    SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) AS completed_appointments
FROM doctor d
JOIN department dept ON d.department_id = dept.department_id
LEFT JOIN appointment a ON d.doctor_id = a.doctor_id
GROUP BY d.doctor_id, d.name, dept.department_name
ORDER BY total_appointments DESC;

SELECT '--- Analytics 2: Room Occupancy Rate by Type ---' AS Section;
SELECT 
    room_type,
    COUNT(*) AS total_rooms,
    SUM(CASE WHEN availability = 'Occupied' THEN 1 ELSE 0 END) AS occupied_rooms,
    ROUND((SUM(CASE WHEN availability = 'Occupied' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS occupancy_percentage
FROM room
GROUP BY room_type;

SELECT '--- Analytics 3: Outstanding Unpaid Bills (Subquery) ---' AS Section;
SELECT 
    p.patient_id,
    p.name AS patient_name,
    p.phone_no,
    b.amount AS outstanding_amount
FROM patient p
JOIN bill b ON p.patient_id = b.patient_id
WHERE b.payment_status = 'Pending'
  AND b.amount > (SELECT AVG(amount) FROM bill);


-- ============================================================================
-- PART 7: ACID TRANSACTIONS DEMONSTRATION (Commit & Rollback)
-- ============================================================================
SELECT '--- ACID Transaction Test: Rollback Demonstration ---' AS Section;
START TRANSACTION;
-- Simulate a room maintenance update that gets cancelled
UPDATE room SET availability = 'Maintenance' WHERE room_no = 302;
SELECT room_no, availability FROM room WHERE room_no = 302; -- Shows 'Maintenance' inside transaction
ROLLBACK;
-- After rollback: Room 302 reverts to its original status 'Available'
SELECT room_no, availability AS status_after_rollback FROM room WHERE room_no = 302;

SELECT '--- ACID Transaction Test: Commit Demonstration ---' AS Section;
START TRANSACTION;
-- Atomic insert: Patient admission with room assignment
INSERT INTO patient (name, age, gender, phone_no, address, room_no)
VALUES ('Karan Singhania', 35, 'Male', '9765012399', 'Model Colony, Pune', 302);
UPDATE room SET availability = 'Occupied' WHERE room_no = 302;
COMMIT;
-- Verified persistent changes
SELECT * FROM patient WHERE phone_no = '9765012399';
SELECT room_no, availability FROM room WHERE room_no = 302;
