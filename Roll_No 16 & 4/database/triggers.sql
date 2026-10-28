-- =============================================================================
-- COLLEGE MANAGEMENT SYSTEM — TRIGGERS & AUDIT LOGGING
-- Demonstrates: BEFORE INSERT, AFTER INSERT, BEFORE UPDATE, AFTER UPDATE
-- Compatible with: MySQL 8.x and MySQL Workbench
-- =============================================================================

USE college_management;

-- Drop existing triggers
DROP TRIGGER IF EXISTS trg_validate_marks_insert;
DROP TRIGGER IF EXISTS trg_validate_marks_update;
DROP TRIGGER IF EXISTS trg_validate_fees_insert;
DROP TRIGGER IF EXISTS trg_validate_fees_update;
DROP TRIGGER IF EXISTS trg_validate_attendance_insert;
DROP TRIGGER IF EXISTS trg_student_audit_insert;
DROP TRIGGER IF EXISTS trg_student_audit_update;
DROP TRIGGER IF EXISTS trg_student_audit_delete;

DELIMITER //

-- =============================================================================
-- Trigger 1: trg_validate_marks_insert (BEFORE INSERT ON results)
-- Purpose: Ensures marks are >= 0 and <= exam maximum marks, assigns grade
-- =============================================================================
CREATE TRIGGER trg_validate_marks_insert
BEFORE INSERT ON results
FOR EACH ROW
BEGIN
    DECLARE v_max_marks DECIMAL(5,2);
    DECLARE v_pct DECIMAL(5,2);

    -- Fetch maximum marks for the exam
    SELECT maximum_marks INTO v_max_marks
    FROM examinations
    WHERE exam_id = NEW.exam_id;

    -- Validation rule 1: Marks cannot be negative
    IF NEW.marks_obtained < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Marks obtained cannot be negative';
    END IF;

    -- Validation rule 2: Marks cannot exceed maximum marks
    IF v_max_marks IS NOT NULL AND NEW.marks_obtained > v_max_marks THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Marks obtained cannot exceed the exam maximum marks';
    END IF;

    -- Automatic Grade Calculation
    IF v_max_marks IS NOT NULL AND v_max_marks > 0 THEN
        SET v_pct = (NEW.marks_obtained / v_max_marks) * 100.0;
        IF v_pct >= 90.0 THEN
            SET NEW.grade = 'O';
        ELSEIF v_pct >= 80.0 THEN
            SET NEW.grade = 'A+';
        ELSEIF v_pct >= 70.0 THEN
            SET NEW.grade = 'A';
        ELSEIF v_pct >= 60.0 THEN
            SET NEW.grade = 'B+';
        ELSEIF v_pct >= 50.0 THEN
            SET NEW.grade = 'B';
        ELSEIF v_pct >= 40.0 THEN
            SET NEW.grade = 'C';
        ELSE
            SET NEW.grade = 'F';
        END IF;
    END IF;
END //

-- =============================================================================
-- Trigger 2: trg_validate_marks_update (BEFORE UPDATE ON results)
-- Purpose: Validates marks on UPDATE and recalculates grade
-- =============================================================================
CREATE TRIGGER trg_validate_marks_update
BEFORE UPDATE ON results
FOR EACH ROW
BEGIN
    DECLARE v_max_marks DECIMAL(5,2);
    DECLARE v_pct DECIMAL(5,2);

    SELECT maximum_marks INTO v_max_marks
    FROM examinations
    WHERE exam_id = NEW.exam_id;

    IF NEW.marks_obtained < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Marks obtained cannot be negative';
    END IF;

    IF v_max_marks IS NOT NULL AND NEW.marks_obtained > v_max_marks THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Marks obtained cannot exceed the exam maximum marks';
    END IF;

    IF v_max_marks IS NOT NULL AND v_max_marks > 0 THEN
        SET v_pct = (NEW.marks_obtained / v_max_marks) * 100.0;
        IF v_pct >= 90.0 THEN
            SET NEW.grade = 'O';
        ELSEIF v_pct >= 80.0 THEN
            SET NEW.grade = 'A+';
        ELSEIF v_pct >= 70.0 THEN
            SET NEW.grade = 'A';
        ELSEIF v_pct >= 60.0 THEN
            SET NEW.grade = 'B+';
        ELSEIF v_pct >= 50.0 THEN
            SET NEW.grade = 'B';
        ELSEIF v_pct >= 40.0 THEN
            SET NEW.grade = 'C';
        ELSE
            SET NEW.grade = 'F';
        END IF;
    END IF;
END //

-- =============================================================================
-- Trigger 3: trg_validate_fees_insert (BEFORE INSERT ON fees)
-- Purpose: Validates paid <= total, auto-updates payment_status and payment_date
-- =============================================================================
CREATE TRIGGER trg_validate_fees_insert
BEFORE INSERT ON fees
FOR EACH ROW
BEGIN
    -- Validation rule 1: Paid amount cannot be negative
    IF NEW.paid_amount < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Paid fee amount cannot be negative';
    END IF;

    -- Validation rule 2: Paid amount cannot exceed total amount
    IF NEW.paid_amount > NEW.total_amount THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Paid amount cannot exceed the total fee amount';
    END IF;

    -- Automatic Status Assignment
    IF NEW.paid_amount = 0 THEN
        SET NEW.payment_status = 'Pending';
    ELSEIF NEW.paid_amount < NEW.total_amount THEN
        SET NEW.payment_status = 'Partial';
    ELSE
        SET NEW.payment_status = 'Paid';
    END IF;

    -- Auto-populate payment date if paid > 0 and date not set
    IF NEW.paid_amount > 0 AND NEW.payment_date IS NULL THEN
        SET NEW.payment_date = CURRENT_DATE;
    END IF;
END //

-- =============================================================================
-- Trigger 4: trg_validate_fees_update (BEFORE UPDATE ON fees)
-- Purpose: Validates fee changes on UPDATE and synchronizes status & date
-- =============================================================================
CREATE TRIGGER trg_validate_fees_update
BEFORE UPDATE ON fees
FOR EACH ROW
BEGIN
    IF NEW.paid_amount < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Paid fee amount cannot be negative';
    END IF;

    IF NEW.paid_amount > NEW.total_amount THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Paid amount cannot exceed the total fee amount';
    END IF;

    IF NEW.paid_amount = 0 THEN
        SET NEW.payment_status = 'Pending';
    ELSEIF NEW.paid_amount < NEW.total_amount THEN
        SET NEW.payment_status = 'Partial';
    ELSE
        SET NEW.payment_status = 'Paid';
    END IF;

    IF NEW.paid_amount > 0 AND NEW.payment_date IS NULL THEN
        SET NEW.payment_date = CURRENT_DATE;
    END IF;
END //

-- =============================================================================
-- Trigger 5: trg_validate_attendance_insert (BEFORE INSERT ON attendance)
-- Purpose: Prevents marking attendance for future dates
-- =============================================================================
CREATE TRIGGER trg_validate_attendance_insert
BEFORE INSERT ON attendance
FOR EACH ROW
BEGIN
    IF NEW.attendance_date > CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Validation Error: Attendance cannot be marked for future dates';
    END IF;
END //

-- =============================================================================
-- Trigger 6: trg_student_audit_insert (AFTER INSERT ON students)
-- Purpose: Records student creation in student_audit_log
-- =============================================================================
CREATE TRIGGER trg_student_audit_insert
AFTER INSERT ON students
FOR EACH ROW
BEGIN
    INSERT INTO student_audit_log (
        student_id, action_type, performed_by, details
    ) VALUES (
        NEW.student_id,
        'INSERT',
        CURRENT_USER(),
        CONCAT('New student created. Roll: ', NEW.roll_number, ', Name: ', NEW.full_name, ', DeptID: ', NEW.department_id, ', Sem: ', NEW.semester)
    );
END //

-- =============================================================================
-- Trigger 7: trg_student_audit_update (AFTER UPDATE ON students)
-- Purpose: Records student modification in student_audit_log
-- =============================================================================
CREATE TRIGGER trg_student_audit_update
AFTER UPDATE ON students
FOR EACH ROW
BEGIN
    INSERT INTO student_audit_log (
        student_id, action_type, performed_by, details
    ) VALUES (
        NEW.student_id,
        'UPDATE',
        CURRENT_USER(),
        CONCAT('Student updated [ID ', NEW.student_id, ']. Old: (Name: ', OLD.full_name, ', DeptID: ', OLD.department_id, ', Sem: ', OLD.semester, ', Email: ', OLD.email, ') -> New: (Name: ', NEW.full_name, ', DeptID: ', NEW.department_id, ', Sem: ', NEW.semester, ', Email: ', NEW.email, ')')
    );
END //

-- =============================================================================
-- Trigger 8: trg_student_audit_delete (AFTER DELETE ON students)
-- Purpose: Records student deletion in student_audit_log
-- =============================================================================
CREATE TRIGGER trg_student_audit_delete
AFTER DELETE ON students
FOR EACH ROW
BEGIN
    INSERT INTO student_audit_log (
        student_id, action_type, performed_by, details
    ) VALUES (
        OLD.student_id,
        'DELETE',
        CURRENT_USER(),
        CONCAT('Student deleted. ID: ', OLD.student_id, ', Roll: ', OLD.roll_number, ', Name: ', OLD.full_name, ', DeptID: ', OLD.department_id)
    );
END //

DELIMITER ;

-- =============================================================================
-- TRIGGER TEST CASES AND EXPECTED OUTPUTS
-- =============================================================================

-- TEST CASE 1: Marks exceeding maximum marks (Should Fail with Error 45000)
-- Exam 1 has max marks 50. Inserting 55 marks:
-- INSERT INTO results (exam_id, student_id, marks_obtained) VALUES (1, 4, 55.00);
-- EXPECTED OUTPUT: Error Code: 1644. Validation Error: Marks obtained cannot exceed the exam maximum marks

-- TEST CASE 2: Negative Marks (Should Fail with Error 45000)
-- INSERT INTO results (exam_id, student_id, marks_obtained) VALUES (1, 4, -5.00);
-- EXPECTED OUTPUT: Error Code: 1644. Validation Error: Marks obtained cannot be negative

-- TEST CASE 3: Fee paid exceeding total fee (Should Fail with Error 45000)
-- INSERT INTO fees (student_id, fee_type, total_amount, paid_amount) VALUES (1, 'Testing Fee', 5000.00, 6000.00);
-- EXPECTED OUTPUT: Error Code: 1644. Validation Error: Paid amount cannot exceed the total fee amount

-- TEST CASE 4: Automatic Fee Payment Status Update (Should Succeed)
-- INSERT INTO fees (student_id, fee_type, total_amount, paid_amount) VALUES (4, 'Sports Fee', 2000.00, 1000.00);
-- SELECT fee_id, total_amount, paid_amount, payment_status FROM fees WHERE fee_type = 'Sports Fee';
-- EXPECTED OUTPUT: payment_status = 'Partial'

-- TEST CASE 5: Student Audit Log Verification (Should Succeed)
-- UPDATE students SET full_name = 'Aarav R. Mehta' WHERE student_id = 1;
-- SELECT * FROM student_audit_log ORDER BY log_id DESC LIMIT 1;
-- EXPECTED OUTPUT: Row showing action_type = 'UPDATE' with old and new details.
