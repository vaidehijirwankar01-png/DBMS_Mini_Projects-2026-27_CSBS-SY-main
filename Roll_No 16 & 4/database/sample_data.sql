-- =============================================================================
-- COLLEGE MANAGEMENT SYSTEM — SAMPLE DATA (DML)
-- Database Name: college_management
-- Compatible with: MySQL 8.x and MySQL Workbench
-- =============================================================================

USE college_management;

-- Disable foreign key checks for clean truncation and insertion
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE student_audit_log;
TRUNCATE TABLE department_summary;
TRUNCATE TABLE users;
TRUNCATE TABLE fees;
TRUNCATE TABLE results;
TRUNCATE TABLE examinations;
TRUNCATE TABLE attendance;
TRUNCATE TABLE enrollments;
TRUNCATE TABLE courses;
TRUNCATE TABLE faculty;
TRUNCATE TABLE students;
TRUNCATE TABLE departments;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. INSERT DEPARTMENTS (4 Departments)
-- =============================================================================
INSERT INTO departments (department_id, department_name, hod_name, office_location) VALUES
(1, 'Computer Science & Business Systems', 'Dr. Ramesh Sharma', 'Tech Block A, Room 301'),
(2, 'Computer Engineering', 'Dr. Sunita Deshmukh', 'Tech Block A, Room 201'),
(3, 'Information Technology', 'Dr. Rajesh Patil', 'Tech Block B, Room 105'),
(4, 'Electronics & Telecommunication', 'Dr. Priya Kulkarni', 'Tech Block C, Room 402');

-- =============================================================================
-- 2. INSERT FACULTY (6 Faculty Members)
-- =============================================================================
INSERT INTO faculty (faculty_id, full_name, email, phone, department_id, designation, salary) VALUES
(1, 'Dr. Ramesh Sharma', 'ramesh.sharma@college.edu', '+919876543210', 1, 'Professor & HOD', 125000.00),
(2, 'Prof. Anita Verma', 'anita.verma@college.edu', '+919876543211', 1, 'Associate Professor', 95000.00),
(3, 'Dr. Sunita Deshmukh', 'sunita.deshmukh@college.edu', '+919876543212', 2, 'Professor & HOD', 130000.00),
(4, 'Prof. Amit Joshi', 'amit.joshi@college.edu', '+919876543213', 2, 'Assistant Professor', 75000.00),
(5, 'Dr. Rajesh Patil', 'rajesh.patil@college.edu', '+919876543214', 3, 'Professor & HOD', 120000.00),
(6, 'Prof. Sneha Kadam', 'sneha.kadam@college.edu', '+919876543215', 3, 'Assistant Professor', 72000.00);

-- =============================================================================
-- 3. INSERT STUDENTS (12 Students across departments)
-- Note: Student 12 has no enrollments (used for Unenrolled Students report)
-- =============================================================================
INSERT INTO students (student_id, roll_number, full_name, email, phone, date_of_birth, gender, department_id, admission_year, semester, address) VALUES
(1,  'CSBS2023001', 'Aarav Mehta',     'aarav.mehta@student.college.edu',    '+919823001122', '2004-05-15', 'Male',   1, 2023, 4, 'Flat 402, Green Meadows, Pune'),
(2,  'CSBS2023002', 'Diya Patel',      'diya.patel@student.college.edu',     '+919823001123', '2004-08-22', 'Female', 1, 2023, 4, '12, Sunrise Enclave, Mumbai'),
(3,  'CSBS2023003', 'Rohan Gupta',     'rohan.gupta@student.college.edu',    '+919823001124', '2003-11-10', 'Male',   1, 2023, 4, 'B-14, Royal Palm Residency, Pune'),
(4,  'CS2023001',   'Ananya Iyer',     'ananya.iyer@student.college.edu',    '+919823001125', '2004-03-18', 'Female', 2, 2023, 4, '45/2, Lake View Apartments, Thane'),
(5,  'CS2023002',   'Ishaan Deshmukh', 'ishaan.d@student.college.edu',       '+919823001126', '2004-07-29', 'Male',   2, 2023, 4, 'Plot 8, Anand Nagar, Nashik'),
(6,  'CS2023003',   'Rhea Sen',        'rhea.sen@student.college.edu',       '+919823001127', '2003-12-05', 'Female', 2, 2023, 4, '701, Silver Crest, Pune'),
(7,  'IT2023001',   'Aditya Shinde',   'aditya.shinde@student.college.edu',  '+919823001128', '2004-01-30', 'Male',   3, 2023, 4, '15, Blossom Heights, Pune'),
(8,  'IT2023002',   'Pooja Nair',      'pooja.nair@student.college.edu',     '+919823001129', '2004-09-14', 'Female', 3, 2023, 4, 'C-303, Emerald Park, Navi Mumbai'),
(9,  'ET2023001',   'Varun Kulkarni',  'varun.k@student.college.edu',        '+919823001130', '2004-04-12', 'Male',   4, 2023, 4, '22, Hill View Colony, Pune'),
(10, 'CSBS2024001', 'Kavya Shah',      'kavya.shah@student.college.edu',     '+919823001131', '2005-06-25', 'Female', 1, 2024, 2, '902, Cypress Tower, Mumbai'),
(11, 'CS2024001',   'Manish Reddy',    'manish.reddy@student.college.edu',   '+919823001132', '2005-02-14', 'Male',   2, 2024, 2, '54, Gulmohar Road, Pune'),
(12, 'ET2024001',   'Tanmay Joshi',    'tanmay.joshi@student.college.edu',   '+919823001133', '2005-10-08', 'Male',   4, 2024, 2, '18, Samarth Nagar, Aurangabad');

-- =============================================================================
-- 4. INSERT COURSES (8 Courses)
-- Course 7 has no faculty assigned (tests LEFT/RIGHT JOIN)
-- Course 8 has no students enrolled (tests Courses with No Students report)
-- =============================================================================
INSERT INTO courses (course_id, course_name, course_code, credits, department_id, faculty_id) VALUES
(1, 'Database Management Systems',       'CSBS201', 4, 1, 1),
(2, 'Financial Accounting & Costing',    'CSBS202', 3, 1, 2),
(3, 'Data Structures & Algorithms',      'CS201',   4, 2, 3),
(4, 'Operating Systems',                 'CS202',   4, 2, 4),
(5, 'Computer Networks',                 'IT201',   4, 3, 5),
(6, 'Web Technology & Security',         'IT202',   3, 3, 6),
(7, 'Digital Signal Processing',         'ET201',   4, 4, NULL),
(8, 'Quantum Computing & Business',      'CSBS301', 3, 1, 1);

-- =============================================================================
-- 5. INSERT ENROLLMENTS (22 Enrollments)
-- =============================================================================
INSERT INTO enrollments (enrollment_id, student_id, course_id, academic_year, semester, enrollment_date) VALUES
(1,  1, 1, '2024-2025', 4, '2024-07-15'),
(2,  1, 2, '2024-2025', 4, '2024-07-15'),
(3,  2, 1, '2024-2025', 4, '2024-07-15'),
(4,  2, 2, '2024-2025', 4, '2024-07-15'),
(5,  3, 1, '2024-2025', 4, '2024-07-16'),
(6,  3, 2, '2024-2025', 4, '2024-07-16'),
(7,  4, 3, '2024-2025', 4, '2024-07-16'),
(8,  4, 4, '2024-2025', 4, '2024-07-16'),
(9,  5, 3, '2024-2025', 4, '2024-07-17'),
(10, 5, 4, '2024-2025', 4, '2024-07-17'),
(11, 6, 3, '2024-2025', 4, '2024-07-17'),
(12, 6, 4, '2024-2025', 4, '2024-07-17'),
(13, 7, 5, '2024-2025', 4, '2024-07-18'),
(14, 7, 6, '2024-2025', 4, '2024-07-18'),
(15, 8, 5, '2024-2025', 4, '2024-07-18'),
(16, 8, 6, '2024-2025', 4, '2024-07-18'),
(17, 9, 7, '2024-2025', 4, '2024-07-19'),
(18, 10, 1, '2024-2025', 2, '2024-07-20'),
(19, 10, 2, '2024-2025', 2, '2024-07-20'),
(20, 11, 3, '2024-2025', 2, '2024-07-20'),
(21, 1, 3, '2024-2025', 4, '2024-07-21'),
(22, 2, 4, '2024-2025', 4, '2024-07-21');

-- =============================================================================
-- 6. INSERT ATTENDANCE (36 Attendance Records)
-- =============================================================================
INSERT INTO attendance (attendance_id, student_id, course_id, attendance_date, status) VALUES
-- Course 1 (DBMS)
(1,  1, 1, '2024-08-01', 'Present'),
(2,  1, 1, '2024-08-02', 'Present'),
(3,  1, 1, '2024-08-03', 'Absent'),
(4,  1, 1, '2024-08-04', 'Present'),
(5,  2, 1, '2024-08-01', 'Present'),
(6,  2, 1, '2024-08-02', 'Present'),
(7,  2, 1, '2024-08-03', 'Present'),
(8,  2, 1, '2024-08-04', 'Present'),
(9,  3, 1, '2024-08-01', 'Absent'),
(10, 3, 1, '2024-08-02', 'Present'),
(11, 3, 1, '2024-08-03', 'Absent'),
(12, 3, 1, '2024-08-04', 'Present'),
(13, 10, 1, '2024-08-01', 'Present'),
(14, 10, 1, '2024-08-02', 'Present'),
(15, 10, 1, '2024-08-03', 'Late'),
(16, 10, 1, '2024-08-04', 'Present'),

-- Course 2 (Financial Accounting)
(17, 1, 2, '2024-08-01', 'Present'),
(18, 1, 2, '2024-08-02', 'Present'),
(19, 2, 2, '2024-08-01', 'Present'),
(20, 2, 2, '2024-08-02', 'Absent'),
(21, 3, 2, '2024-08-01', 'Present'),
(22, 3, 2, '2024-08-02', 'Present'),

-- Course 3 (DSA)
(23, 4, 3, '2024-08-01', 'Present'),
(24, 4, 3, '2024-08-02', 'Present'),
(25, 4, 3, '2024-08-03', 'Present'),
(26, 5, 3, '2024-08-01', 'Present'),
(27, 5, 3, '2024-08-02', 'Absent'),
(28, 5, 3, '2024-08-03', 'Present'),
(29, 6, 3, '2024-08-01', 'Present'),
(30, 6, 3, '2024-08-02', 'Present'),
(31, 6, 3, '2024-08-03', 'Late'),

-- Course 5 (Networks)
(32, 7, 5, '2024-08-01', 'Present'),
(33, 7, 5, '2024-08-02', 'Present'),
(34, 8, 5, '2024-08-01', 'Present'),
(35, 8, 5, '2024-08-02', 'Present'),

-- Course 7 (DSP)
(36, 9, 7, '2024-08-01', 'Present');

-- =============================================================================
-- 7. INSERT EXAMINATIONS (6 Exams)
-- =============================================================================
INSERT INTO examinations (exam_id, course_id, exam_name, exam_date, maximum_marks) VALUES
(1, 1, 'Mid-Term Exam', '2024-09-15', 50.00),
(2, 1, 'End-Term Exam', '2024-11-20', 100.00),
(3, 2, 'Mid-Term Exam', '2024-09-16', 50.00),
(4, 2, 'End-Term Exam', '2024-11-21', 100.00),
(5, 3, 'Mid-Term Exam', '2024-09-17', 50.00),
(6, 3, 'End-Term Exam', '2024-11-22', 100.00);

-- =============================================================================
-- 8. INSERT RESULTS (16 Results)
-- =============================================================================
INSERT INTO results (result_id, exam_id, student_id, marks_obtained, grade) VALUES
-- Exam 1: DBMS Mid-Term (Max 50)
(1,  1, 1, 46.50, 'A+'),
(2,  1, 2, 48.00, 'O'),
(3,  1, 3, 34.00, 'B+'),
(4,  1, 10, 42.50, 'A'),

-- Exam 2: DBMS End-Term (Max 100)
(5,  2, 1, 91.00, 'O'),
(6,  2, 2, 94.50, 'O'),
(7,  2, 3, 68.00, 'B+'),
(8,  2, 10, 84.00, 'A+'),

-- Exam 3: Accounting Mid-Term (Max 50)
(9,  3, 1, 44.00, 'A+'),
(10, 3, 2, 47.00, 'O'),
(11, 3, 3, 38.00, 'A'),

-- Exam 5: DSA Mid-Term (Max 50)
(12, 5, 4, 45.00, 'A+'),
(13, 5, 5, 39.00, 'A'),
(14, 5, 6, 42.00, 'A'),

-- Exam 6: DSA End-Term (Max 100)
(15, 6, 4, 88.00, 'A+'),
(16, 6, 5, 76.00, 'B+');

-- =============================================================================
-- 9. INSERT FEES (16 Fee Records)
-- =============================================================================
INSERT INTO fees (fee_id, student_id, fee_type, total_amount, paid_amount, payment_date, payment_status) VALUES
(1,  1,  'Tuition Fee', 85000.00, 85000.00, '2024-07-10', 'Paid'),
(2,  1,  'Hostel Fee',  45000.00, 45000.00, '2024-07-10', 'Paid'),
(3,  2,  'Tuition Fee', 85000.00, 85000.00, '2024-07-12', 'Paid'),
(4,  2,  'Hostel Fee',  45000.00, 20000.00, '2024-07-12', 'Partial'),
(5,  3,  'Tuition Fee', 85000.00, 40000.00, '2024-07-15', 'Partial'),
(6,  3,  'Exam Fee',     3500.00,    0.00, NULL,         'Pending'),
(7,  4,  'Tuition Fee', 85000.00, 85000.00, '2024-07-14', 'Paid'),
(8,  4,  'Library Fee',  2500.00,  2500.00, '2024-07-14', 'Paid'),
(9,  5,  'Tuition Fee', 85000.00, 50000.00, '2024-07-16', 'Partial'),
(10, 6,  'Tuition Fee', 85000.00,     0.00, NULL,         'Pending'),
(11, 7,  'Tuition Fee', 85000.00, 85000.00, '2024-07-11', 'Paid'),
(12, 8,  'Tuition Fee', 85000.00, 42500.00, '2024-07-18', 'Partial'),
(13, 9,  'Tuition Fee', 85000.00,     0.00, NULL,         'Pending'),
(14, 10, 'Tuition Fee', 90000.00, 90000.00, '2024-07-20', 'Paid'),
(15, 11, 'Tuition Fee', 90000.00, 45000.00, '2024-07-22', 'Partial'),
(16, 12, 'Tuition Fee', 90000.00,     0.00, NULL,         'Pending');

-- =============================================================================
-- 10. INSERT APPLICATION USERS
-- Default Passwords:
-- admin -> admin123
-- faculty1 -> faculty123
-- clerk1 -> clerk123
-- student1 -> student123
-- =============================================================================
INSERT INTO users (user_id, username, password_hash, full_name, email, role) VALUES
(1, 'admin', 'scrypt:32768:8:1$XT4v2JtJlkTEAYCA$9c23d339afde7cff3ac77350a85bbf3bbf0a8067761782ffe3295803e2c46d9674f02334a61ba0d8d6f35624550643d2c3677ac25083c1da5853a5177faf61c9', 'Administrator', 'admin@college.edu', 'Admin'),
(2, 'faculty1', 'scrypt:32768:8:1$oLqb1nb0WGfdV1oG$f79476f6af3d08d64a373f2b260b40807a72b7892e959990dd6c4ff37ed5cdad6bf2cb9f76adc9240c2d42b80e1323bb2c20049b97ac03f9929b7528a21b695a', 'Dr. Ramesh Sharma', 'ramesh.sharma@college.edu', 'Faculty'),
(3, 'clerk1', 'scrypt:32768:8:1$dlcP9X7KPk5ikeM9$570a462bcb620f4e7ffa1255fa8b0ee2a7bda2f783075cb0503ecb164cc16d4a49400e2bb3ca68222cc9fd6dd363c956eb7b0b9c7e4922626e09ddc8825b1ece', 'Accounts Clerk Sunita', 'accounts@college.edu', 'Clerk'),
(4, 'student1', 'scrypt:32768:8:1$admJkW47C0pDevvs$01e8d189ff70f4eac147310b08154455090ce3f4d5073134a8d9c4443d666b51c0aa21e42ac409c9b23ee43dccbc4b2fad26df001e3c4b0e15ec3426f3b25b81', 'Aarav Mehta', 'aarav.mehta@student.college.edu', 'Student');
