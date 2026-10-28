-- =============================================================================
-- COLLEGE MANAGEMENT SYSTEM — STORED PROCEDURES
-- Demonstrates: DELIMITER, CREATE PROCEDURE, CALL, IN, OUT, and INOUT Parameters
-- Compatible with: MySQL 8.x and MySQL Workbench
-- =============================================================================

USE college_management;

-- Drop existing procedures if they exist
DROP PROCEDURE IF EXISTS AddStudent;
DROP PROCEDURE IF EXISTS UpdateStudent;
DROP PROCEDURE IF EXISTS GetStudentDetails;
DROP PROCEDURE IF EXISTS GetStudentFeeSummary;
DROP PROCEDURE IF EXISTS GetDepartmentStudentCount;
DROP PROCEDURE IF EXISTS CalculateAttendancePercentage;

DELIMITER //

-- =============================================================================
-- 1. Procedure: AddStudent
-- Demonstrates: IN and OUT parameters with validation
-- =============================================================================
CREATE PROCEDURE AddStudent(
    IN p_roll_number VARCHAR(20),
    IN p_full_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_phone VARCHAR(15),
    IN p_dob DATE,
    IN p_gender ENUM('Male', 'Female', 'Other'),
    IN p_department_id INT,
    IN p_admission_year INT,
    IN p_semester INT,
    IN p_address TEXT,
    OUT p_student_id INT,
    OUT p_status_message VARCHAR(255)
)
BEGIN
    DECLARE v_count INT DEFAULT 0;

    -- Check if roll number already exists
    SELECT COUNT(*) INTO v_count FROM students WHERE roll_number = p_roll_number;
    IF v_count > 0 THEN
        SET p_student_id = -1;
        SET p_status_message = CONCAT('Error: Roll number ', p_roll_number, ' already exists');
    ELSE
        -- Check if email already exists
        SELECT COUNT(*) INTO v_count FROM students WHERE email = p_email;
        IF v_count > 0 THEN
            SET p_student_id = -1;
            SET p_status_message = CONCAT('Error: Email ', p_email, ' already registered');
        ELSE
            -- Insert new student
            INSERT INTO students (
                roll_number, full_name, email, phone, date_of_birth,
                gender, department_id, admission_year, semester, address
            ) VALUES (
                p_roll_number, p_full_name, p_email, p_phone, p_dob,
                p_gender, p_department_id, p_admission_year, p_semester, p_address
            );
            SET p_student_id = LAST_INSERT_ID();
            SET p_status_message = 'Success: Student enrolled successfully';
        END IF;
    END IF;
END //

-- =============================================================================
-- 2. Procedure: UpdateStudent
-- Demonstrates: IN and OUT parameters returning ROW_COUNT()
-- =============================================================================
CREATE PROCEDURE UpdateStudent(
    IN p_student_id INT,
    IN p_full_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_phone VARCHAR(15),
    IN p_department_id INT,
    IN p_semester INT,
    IN p_address TEXT,
    OUT p_rows_affected INT
)
BEGIN
    UPDATE students
    SET full_name = p_full_name,
        email = p_email,
        phone = p_phone,
        department_id = p_department_id,
        semester = p_semester,
        address = p_address
    WHERE student_id = p_student_id;

    SET p_rows_affected = ROW_COUNT();
END //

-- =============================================================================
-- 3. Procedure: GetStudentDetails
-- Demonstrates: IN parameter returning a full result set via SELECT JOIN
-- =============================================================================
CREATE PROCEDURE GetStudentDetails(
    IN p_student_id INT
)
BEGIN
    SELECT 
        s.student_id,
        s.roll_number,
        s.full_name,
        s.email,
        s.phone,
        s.date_of_birth,
        s.gender,
        s.admission_year,
        s.semester,
        s.address,
        d.department_id,
        d.department_name,
        d.hod_name,
        d.office_location
    FROM students s
    INNER JOIN departments d ON s.department_id = d.department_id
    WHERE s.student_id = p_student_id;
END //

-- =============================================================================
-- 4. Procedure: GetStudentFeeSummary
-- Demonstrates: Multiple OUT parameters computing aggregate values
-- =============================================================================
CREATE PROCEDURE GetStudentFeeSummary(
    IN p_student_id INT,
    OUT p_total_fees DECIMAL(10,2),
    OUT p_paid_fees DECIMAL(10,2),
    OUT p_pending_fees DECIMAL(10,2)
)
BEGIN
    SELECT 
        COALESCE(SUM(total_amount), 0.00),
        COALESCE(SUM(paid_amount), 0.00),
        COALESCE(SUM(total_amount - paid_amount), 0.00)
    INTO p_total_fees, p_paid_fees, p_pending_fees
    FROM fees
    WHERE student_id = p_student_id;
END //

-- =============================================================================
-- 5. Procedure: GetDepartmentStudentCount
-- Demonstrates: IN and OUT parameters
-- =============================================================================
CREATE PROCEDURE GetDepartmentStudentCount(
    IN p_department_id INT,
    OUT p_student_count INT
)
BEGIN
    SELECT COUNT(*) INTO p_student_count
    FROM students
    WHERE department_id = p_department_id;
END //

-- =============================================================================
-- 6. Procedure: CalculateAttendancePercentage
-- Demonstrates: INOUT parameter (receives initial value/threshold, returns actual %)
-- =============================================================================
CREATE PROCEDURE CalculateAttendancePercentage(
    IN p_student_id INT,
    IN p_course_id INT,
    INOUT p_attendance_pct DECIMAL(5,2)
)
BEGIN
    DECLARE v_total_sessions INT DEFAULT 0;
    DECLARE v_present_sessions INT DEFAULT 0;

    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status IN ('Present', 'Late') THEN 1 END)
    INTO v_total_sessions, v_present_sessions
    FROM attendance
    WHERE student_id = p_student_id AND course_id = p_course_id;

    IF v_total_sessions > 0 THEN
        SET p_attendance_pct = ROUND((v_present_sessions / v_total_sessions) * 100.0, 2);
    ELSE
        SET p_attendance_pct = 0.00;
    END IF;
END //

DELIMITER ;

-- =============================================================================
-- MYSQL WORKBENCH EXECUTION EXAMPLES
-- Run each block below in MySQL Workbench to test stored procedures:
-- =============================================================================

-- Example 1: Test AddStudent
-- CALL AddStudent('CSBS2024005', 'Nikhil Shinde', 'nikhil.s@student.college.edu', '+919823001199', '2005-04-10', 'Male', 1, 2024, 2, 'Pune', @new_id, @msg);
-- SELECT @new_id AS new_student_id, @msg AS result_message;

-- Example 2: Test GetStudentDetails
-- CALL GetStudentDetails(1);

-- Example 3: Test GetStudentFeeSummary
-- CALL GetStudentFeeSummary(1, @total, @paid, @pending);
-- SELECT @total AS total_fee, @paid AS paid_fee, @pending AS pending_fee;

-- Example 4: Test GetDepartmentStudentCount
-- CALL GetDepartmentStudentCount(1, @dept_count);
-- SELECT @dept_count AS csbs_student_count;

-- Example 5: Test CalculateAttendancePercentage (INOUT parameter)
-- SET @pct = 0.00;
-- CALL CalculateAttendancePercentage(1, 1, @pct);
-- SELECT @pct AS attendance_percentage;
