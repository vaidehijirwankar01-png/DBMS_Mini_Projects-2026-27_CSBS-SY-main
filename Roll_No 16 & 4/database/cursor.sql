-- =============================================================================
-- COLLEGE MANAGEMENT SYSTEM — CURSOR STORED PROCEDURE
-- Demonstrates: DECLARE CURSOR, OPEN, FETCH, NOT FOUND Handler, and CLOSE
-- Compatible with: MySQL 8.x and MySQL Workbench
-- =============================================================================

USE college_management;

DROP PROCEDURE IF EXISTS GenerateDepartmentReport;

DELIMITER //

CREATE PROCEDURE GenerateDepartmentReport()
BEGIN
    -- 1. Declare loop control and variables
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_dept_id INT;
    DECLARE v_dept_name VARCHAR(100);
    DECLARE v_students_count INT DEFAULT 0;
    DECLARE v_faculty_count INT DEFAULT 0;
    DECLARE v_courses_count INT DEFAULT 0;
    DECLARE v_fee_collected DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_fee_pending DECIMAL(12,2) DEFAULT 0.00;

    -- 2. Declare Cursor for iterating through each department
    DECLARE dept_cursor CURSOR FOR
        SELECT department_id, department_name
        FROM departments
        ORDER BY department_id ASC;

    -- 3. Declare NOT FOUND Handler to exit loop
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    -- Clear previous report records
    TRUNCATE TABLE department_summary;

    -- 4. Open Cursor
    OPEN dept_cursor;

    -- 5. Cursor Iteration Loop
    dept_loop: LOOP
        -- Fetch next department row
        FETCH dept_cursor INTO v_dept_id, v_dept_name;

        -- Break loop when no more rows exist
        IF v_done = 1 THEN
            LEAVE dept_loop;
        END IF;

        -- Aggregate student count for current department
        SELECT COUNT(*)
        INTO v_students_count
        FROM students
        WHERE department_id = v_dept_id;

        -- Aggregate faculty count for current department
        SELECT COUNT(*)
        INTO v_faculty_count
        FROM faculty
        WHERE department_id = v_dept_id;

        -- Aggregate courses count for current department
        SELECT COUNT(*)
        INTO v_courses_count
        FROM courses
        WHERE department_id = v_dept_id;

        -- Aggregate financial metrics for current department
        SELECT 
            COALESCE(SUM(f.paid_amount), 0.00),
            COALESCE(SUM(f.total_amount - f.paid_amount), 0.00)
        INTO v_fee_collected, v_fee_pending
        FROM fees f
        INNER JOIN students s ON f.student_id = s.student_id
        WHERE s.department_id = v_dept_id;

        -- Insert cursor-processed aggregate into summary table
        INSERT INTO department_summary (
            department_id,
            department_name,
            total_students,
            total_faculty,
            total_courses,
            total_fee_collected,
            total_fee_pending,
            generated_at
        ) VALUES (
            v_dept_id,
            v_dept_name,
            v_students_count,
            v_faculty_count,
            v_courses_count,
            v_fee_collected,
            v_fee_pending,
            NOW()
        );

    END LOOP dept_loop;

    -- 6. Close Cursor
    CLOSE dept_cursor;

    -- Return the freshly generated summary report
    SELECT 
        summary_id,
        department_name,
        total_students,
        total_faculty,
        total_courses,
        total_fee_collected,
        total_fee_pending,
        generated_at
    FROM department_summary
    ORDER BY department_id;

END //

DELIMITER ;

-- =============================================================================
-- MYSQL WORKBENCH EXECUTION
-- Execute the following command to run the cursor and view the report:
-- =============================================================================

-- CALL GenerateDepartmentReport();
-- SELECT * FROM department_summary;
