CREATE DATABASE IF NOT EXISTS college_placement_db;
USE college_placement_db;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'company', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    enrollment_number VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department_id INT NOT NULL,
    graduation_year INT NOT NULL,
    cgpa DECIMAL(4,2) NOT NULL,
    backlogs INT DEFAULT 0,
    resume_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    website VARCHAR(255),
    location VARCHAR(255),
    contact_email VARCHAR(255),
    phone VARCHAR(20),
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS placement_drives (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    package DECIMAL(10,2) NOT NULL,
    location VARCHAR(255),
    minimum_cgpa DECIMAL(4,2) NOT NULL,
    maximum_backlogs INT NOT NULL,
    eligible_branches VARCHAR(255) NOT NULL, -- comma separated department codes
    graduation_year INT NOT NULL,
    application_deadline DATETIME NOT NULL,
    drive_date DATETIME NOT NULL,
    status ENUM('upcoming', 'active', 'completed', 'cancelled') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    drive_id INT NOT NULL,
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected') DEFAULT 'Applied',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE CASCADE,
    UNIQUE(student_id, drive_id)
);

CREATE TABLE IF NOT EXISTS selections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    application_id INT NOT NULL,
    student_id INT NOT NULL,
    company_id INT NOT NULL,
    package DECIMAL(10,2) NOT NULL,
    joining_date DATE,
    result ENUM('Selected') DEFAULT 'Selected',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
