-- =============================================================================
-- COLLEGE MANAGEMENT SYSTEM — DATABASE SCHEMA (DDL)
-- Database Name: college_management
-- Compatible with: MySQL 8.x and MySQL Workbench
-- =============================================================================

-- Step 1: Create Database
CREATE DATABASE IF NOT EXISTS college_management
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE college_management;

-- Step 2: Drop Tables in reverse dependency order for safe re-runs
DROP TABLE IF EXISTS department_summary;
DROP TABLE IF EXISTS student_audit_log;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS fees;
DROP TABLE IF EXISTS results;
DROP TABLE IF EXISTS examinations;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS faculty;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS departments;

-- =============================================================================
-- Table 1: departments
-- Stores college academic departments
-- =============================================================================
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    hod_name VARCHAR(100) NOT NULL,
    office_location VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- =============================================================================
-- Table 2: students
-- Stores registered student details
-- =============================================================================
CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    roll_number VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    department_id INT NOT NULL,
    admission_year INT NOT NULL CHECK (admission_year >= 2000),
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    address TEXT,
    CONSTRAINT fk_student_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- Table 3: faculty
-- Stores faculty and professor details
-- =============================================================================
CREATE TABLE faculty (
    faculty_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    department_id INT NOT NULL,
    designation VARCHAR(50) NOT NULL,
    salary DECIMAL(10,2) NOT NULL CHECK (salary > 0),
    CONSTRAINT fk_faculty_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- Table 4: courses
-- Stores academic course curriculum
-- =============================================================================
CREATE TABLE courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    course_code VARCHAR(20) NOT NULL UNIQUE,
    credits INT NOT NULL CHECK (credits BETWEEN 1 AND 6),
    department_id INT NOT NULL,
    faculty_id INT DEFAULT NULL,
    CONSTRAINT fk_course_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_course_faculty
        FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- Table 5: enrollments
-- Tracks student course registrations per term
-- =============================================================================
CREATE TABLE enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    enrollment_date DATE NOT NULL,
    CONSTRAINT uq_student_course_term
        UNIQUE (student_id, course_id, academic_year, semester),
    CONSTRAINT fk_enroll_student
        FOREIGN KEY (student_id) REFERENCES students(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_enroll_course
        FOREIGN KEY (course_id) REFERENCES courses(course_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- Table 6: attendance
-- Records daily lecture/lab attendance
-- =============================================================================
CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL DEFAULT 'Present',
    CONSTRAINT uq_student_attendance
        UNIQUE (student_id, course_id, attendance_date),
    CONSTRAINT fk_attendance_student
        FOREIGN KEY (student_id) REFERENCES students(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_attendance_course
        FOREIGN KEY (course_id) REFERENCES courses(course_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- Table 7: examinations
-- Stores examination schedules and configurations
-- =============================================================================
CREATE TABLE examinations (
    exam_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    exam_name VARCHAR(50) NOT NULL,
    exam_date DATE NOT NULL,
    maximum_marks DECIMAL(5,2) NOT NULL CHECK (maximum_marks > 0),
    CONSTRAINT fk_exam_course
        FOREIGN KEY (course_id) REFERENCES courses(course_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- Table 8: results
-- Stores marks obtained and assigned letter grades
-- =============================================================================
CREATE TABLE results (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    marks_obtained DECIMAL(5,2) NOT NULL CHECK (marks_obtained >= 0),
    grade VARCHAR(5) NOT NULL DEFAULT 'F',
    CONSTRAINT uq_exam_student
        UNIQUE (exam_id, student_id),
    CONSTRAINT fk_result_exam
        FOREIGN KEY (exam_id) REFERENCES examinations(exam_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_result_student
        FOREIGN KEY (student_id) REFERENCES students(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- Table 9: fees
-- Stores student fee obligations and payments
-- =============================================================================
CREATE TABLE fees (
    fee_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    fee_type VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    payment_date DATE DEFAULT NULL,
    payment_status ENUM('Pending', 'Partial', 'Paid') NOT NULL DEFAULT 'Pending',
    CONSTRAINT fk_fee_student
        FOREIGN KEY (student_id) REFERENCES students(student_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- Table 10: users
-- Application user credentials with role-based access
-- =============================================================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('Admin', 'Faculty', 'Clerk', 'Student') NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================================================
-- Table 11: student_audit_log
-- Audit log table populated by triggers on students table
-- =============================================================================
CREATE TABLE student_audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performed_by VARCHAR(50) DEFAULT 'system',
    details TEXT NOT NULL
) ENGINE=InnoDB;

-- =============================================================================
-- Table 12: department_summary
-- Summary report table populated by the cursor procedure
-- =============================================================================
CREATE TABLE department_summary (
    summary_id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    total_students INT DEFAULT 0,
    total_faculty INT DEFAULT 0,
    total_courses INT DEFAULT 0,
    total_fee_collected DECIMAL(12,2) DEFAULT 0.00,
    total_fee_pending DECIMAL(12,2) DEFAULT 0.00,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
