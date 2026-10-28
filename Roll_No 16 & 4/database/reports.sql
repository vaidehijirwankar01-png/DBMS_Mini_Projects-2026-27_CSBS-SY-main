-- =============================================================================
-- COLLEGE MANAGEMENT SYSTEM — SQL JOIN OPERATIONS & REPORTS
-- Demonstrates: INNER JOIN, LEFT JOIN, RIGHT JOIN, CROSS JOIN, SELF JOIN,
-- and Multi-Table Joins (3+ tables)
-- Compatible with: MySQL 8.x and MySQL Workbench
-- =============================================================================

USE college_management;

-- =============================================================================
-- REPORT 1: Students with their Department Names (INNER JOIN)
-- Demonstrates a standard 2-table INNER JOIN on foreign key relationship
-- =============================================================================
SELECT 
    s.student_id,
    s.roll_number,
    s.full_name AS student_name,
    s.email,
    s.semester,
    d.department_name,
    d.hod_name,
    d.office_location
FROM students s
INNER JOIN departments d ON s.department_id = d.department_id
ORDER BY d.department_name, s.roll_number;


-- =============================================================================
-- REPORT 2: Students Enrolled in Courses with Faculty Names (Multi-Table JOIN)
-- Demonstrates joining 4 tables: students, enrollments, courses, and faculty
-- =============================================================================
SELECT 
    s.roll_number,
    s.full_name AS student_name,
    c.course_code,
    c.course_name,
    c.credits,
    COALESCE(f.full_name, 'To Be Assigned') AS instructor_name,
    e.academic_year,
    e.semester AS enrolled_semester
FROM enrollments e
INNER JOIN students s ON e.student_id = s.student_id
INNER JOIN courses c ON e.course_id = c.course_id
LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
ORDER BY s.roll_number, c.course_code;


-- =============================================================================
-- REPORT 3: Students with Attendance Percentages (Aggregate Multi-Table JOIN)
-- Demonstrates aggregate calculations with JOIN and GROUP BY
-- =============================================================================
SELECT 
    s.roll_number,
    s.full_name AS student_name,
    c.course_code,
    c.course_name,
    COUNT(a.attendance_id) AS total_sessions,
    COUNT(CASE WHEN a.status IN ('Present', 'Late') THEN 1 END) AS attended_sessions,
    COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) AS absent_sessions,
    ROUND((COUNT(CASE WHEN a.status IN ('Present', 'Late') THEN 1 END) / NULLIF(COUNT(a.attendance_id), 0)) * 100.0, 2) AS attendance_percentage
FROM attendance a
INNER JOIN students s ON a.student_id = s.student_id
INNER JOIN courses c ON a.course_id = c.course_id
GROUP BY s.student_id, s.roll_number, s.full_name, c.course_id, c.course_code, c.course_name
ORDER BY s.roll_number, c.course_code;


-- =============================================================================
-- REPORT 4: Students with Examination Results and Grades (Multi-Table JOIN)
-- Demonstrates joining results, examinations, courses, and students
-- =============================================================================
SELECT 
    s.roll_number,
    s.full_name AS student_name,
    c.course_code,
    c.course_name,
    ex.exam_name,
    ex.exam_date,
    r.marks_obtained,
    ex.maximum_marks,
    ROUND((r.marks_obtained / ex.maximum_marks) * 100.0, 2) AS percentage,
    r.grade
FROM results r
INNER JOIN students s ON r.student_id = s.student_id
INNER JOIN examinations ex ON r.exam_id = ex.exam_id
INNER JOIN courses c ON ex.course_id = c.course_id
ORDER BY s.roll_number, ex.exam_date;


-- =============================================================================
-- REPORT 5: Student Fee Summary with Paid and Pending Balances (Aggregate JOIN)
-- Demonstrates calculating total, paid, and outstanding dues per student
-- =============================================================================
SELECT 
    s.roll_number,
    s.full_name AS student_name,
    d.department_name,
    COALESCE(SUM(f.total_amount), 0.00) AS total_fees,
    COALESCE(SUM(f.paid_amount), 0.00) AS total_paid,
    COALESCE(SUM(f.total_amount - f.paid_amount), 0.00) AS pending_dues,
    CASE 
        WHEN SUM(f.total_amount - f.paid_amount) = 0 THEN 'Clear'
        WHEN SUM(f.paid_amount) = 0 THEN 'Fully Overdue'
        ELSE 'Partially Due'
    END AS overall_status
FROM students s
INNER JOIN departments d ON s.department_id = d.department_id
LEFT JOIN fees f ON s.student_id = f.student_id
GROUP BY s.student_id, s.roll_number, s.full_name, d.department_name
ORDER BY pending_dues DESC;


-- =============================================================================
-- REPORT 6: Faculty Members with their Departments and Courses (LEFT JOIN)
-- Demonstrates LEFT JOIN to show all faculty including those without courses
-- =============================================================================
SELECT 
    f.faculty_id,
    f.full_name AS faculty_name,
    f.designation,
    d.department_name,
    COALESCE(c.course_code, 'N/A') AS course_code,
    COALESCE(c.course_name, 'No Course Assigned') AS course_name,
    COALESCE(c.credits, 0) AS credits
FROM faculty f
INNER JOIN departments d ON f.department_id = d.department_id
LEFT JOIN courses c ON f.faculty_id = c.faculty_id
ORDER BY d.department_name, f.full_name;


-- =============================================================================
-- REPORT 7: Departments with Student and Faculty Counts (Multi-Subquery / JOIN)
-- Demonstrates department-level aggregate headcount metrics
-- =============================================================================
SELECT 
    d.department_id,
    d.department_name,
    d.hod_name,
    COUNT(DISTINCT s.student_id) AS total_students,
    COUNT(DISTINCT f.faculty_id) AS total_faculty,
    COUNT(DISTINCT c.course_id) AS total_courses
FROM departments d
LEFT JOIN students s ON d.department_id = s.department_id
LEFT JOIN faculty f ON d.department_id = f.department_id
LEFT JOIN courses c ON d.department_id = c.department_id
GROUP BY d.department_id, d.department_name, d.hod_name
ORDER BY d.department_name;


-- =============================================================================
-- REPORT 8: Students Who Have Not Enrolled in Any Course (LEFT JOIN with NULL)
-- Finds registered students without any course enrollments
-- =============================================================================
SELECT 
    s.student_id,
    s.roll_number,
    s.full_name AS student_name,
    s.email,
    s.phone,
    d.department_name,
    s.admission_year,
    s.semester
FROM students s
INNER JOIN departments d ON s.department_id = d.department_id
LEFT JOIN enrollments e ON s.student_id = e.student_id
WHERE e.enrollment_id IS NULL
ORDER BY s.roll_number;


-- =============================================================================
-- REPORT 9: Courses with No Enrolled Students (LEFT JOIN with NULL)
-- Finds courses currently scheduled with zero registered students
-- =============================================================================
SELECT 
    c.course_id,
    c.course_code,
    c.course_name,
    c.credits,
    d.department_name,
    COALESCE(f.full_name, 'Unassigned') AS instructor_name
FROM courses c
INNER JOIN departments d ON c.department_id = d.department_id
LEFT JOIN faculty f ON c.faculty_id = f.faculty_id
LEFT JOIN enrollments e ON c.course_id = e.course_id
WHERE e.enrollment_id IS NULL
ORDER BY c.course_code;


-- =============================================================================
-- REPORT 10: Courses and Assigned Faculty (RIGHT JOIN Demonstration)
-- Demonstrates RIGHT JOIN: Shows all faculty records and their assigned course
-- =============================================================================
SELECT 
    c.course_code,
    c.course_name,
    f.faculty_id,
    f.full_name AS faculty_name,
    f.designation,
    f.email
FROM courses c
RIGHT JOIN faculty f ON c.faculty_id = f.faculty_id
ORDER BY f.full_name;


-- =============================================================================
-- REPORT 11: Department and Academic Year Planning Matrix (CROSS JOIN)
-- Demonstrates Cartesian product (CROSS JOIN) for academic planning cohorts
-- =============================================================================
SELECT 
    d.department_name,
    ay.academic_year,
    sem.semester_number
FROM departments d
CROSS JOIN (
    SELECT '2023-2024' AS academic_year UNION ALL
    SELECT '2024-2025' UNION ALL
    SELECT '2025-2026'
) ay
CROSS JOIN (
    SELECT 1 AS semester_number UNION ALL
    SELECT 2
) sem
ORDER BY d.department_name, ay.academic_year, sem.semester_number;


-- =============================================================================
-- REPORT 12: Faculty Salary Comparison within Same Department (SELF JOIN)
-- Demonstrates SELF JOIN: Compares faculty members working in the same department
-- =============================================================================
SELECT 
    f1.full_name AS faculty_member,
    f1.designation AS designation_1,
    f1.salary AS salary_1,
    f2.full_name AS colleague,
    f2.designation AS designation_2,
    f2.salary AS colleague_salary,
    (f1.salary - f2.salary) AS salary_difference,
    d.department_name
FROM faculty f1
INNER JOIN faculty f2 
    ON f1.department_id = f2.department_id 
    AND f1.faculty_id != f2.faculty_id
INNER JOIN departments d 
    ON f1.department_id = d.department_id
WHERE f1.salary >= f2.salary
ORDER BY d.department_name, salary_difference DESC;
