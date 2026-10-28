-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM - DATABASE SCHEMA (DDL)
-- Step 1: DDL, Relational Constraints, and Performance Indexes
-- Engine: InnoDB (Ensures Foreign Key Enforcement and ACID Transactions)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS hospital_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE hospital_db;

-- Clear existing objects in reverse foreign-key dependency order
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS bill;
DROP TABLE IF EXISTS appointment;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS room;
DROP TABLE IF EXISTS doctor;
DROP TABLE IF EXISTS department;
DROP TABLE IF EXISTS users;

-- 1. SUPPORTING USERS TABLE (Authentication & Role-Based Access)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Staff') NOT NULL DEFAULT 'Staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. CORE ENTITY: DEPARTMENT
CREATE TABLE department (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    floor INT NOT NULL CHECK (floor >= 0),
    hod VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- 3. CORE ENTITY: DOCTOR
CREATE TABLE doctor (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    phone_no VARCHAR(15) NOT NULL UNIQUE,
    salary DECIMAL(10,2) NOT NULL CHECK (salary > 0),
    experience INT NOT NULL CHECK (experience >= 0),
    department_id INT NOT NULL,
    CONSTRAINT fk_doctor_department 
        FOREIGN KEY (department_id) REFERENCES department(department_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. CORE ENTITY: ROOM
CREATE TABLE room (
    room_no INT PRIMARY KEY,
    room_type ENUM('General', 'Semi-Private', 'Private', 'ICU') NOT NULL,
    charges DECIMAL(10,2) NOT NULL CHECK (charges >= 0),
    availability ENUM('Available', 'Occupied', 'Maintenance') NOT NULL DEFAULT 'Available'
) ENGINE=InnoDB;

-- 5. CORE ENTITY: PATIENT
CREATE TABLE patient (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL CHECK (age BETWEEN 0 AND 120),
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    phone_no VARCHAR(15) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    room_no INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_patient_room 
        FOREIGN KEY (room_no) REFERENCES room(room_no) 
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6. CORE ENTITY: APPOINTMENT
CREATE TABLE appointment (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    status ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointment_patient 
        FOREIGN KEY (patient_id) REFERENCES patient(patient_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_appointment_doctor 
        FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_doctor_time_slot UNIQUE (doctor_id, date, time)
) ENGINE=InnoDB;

-- 7. CORE ENTITY: BILL
CREATE TABLE bill (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL UNIQUE, -- Enforces 1:1 billing relationship
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_mode ENUM('Cash', 'Card', 'UPI', 'Insurance', 'Pending') NOT NULL DEFAULT 'Pending',
    payment_status ENUM('Paid', 'Pending', 'Partially Paid') NOT NULL DEFAULT 'Pending',
    date DATE NOT NULL,
    CONSTRAINT fk_bill_patient 
        FOREIGN KEY (patient_id) REFERENCES patient(patient_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 8. AUDIT LOG TABLE (Trigger Target for Security & Audit Trails)
CREATE TABLE audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    record_id INT NOT NULL,
    details TEXT NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- PERFORMANCE INDEXES (Optimizing High-Frequency Search & Filter Paths)
CREATE INDEX idx_appointment_date ON appointment(date);
CREATE INDEX idx_appointment_doc_status ON appointment(doctor_id, status);
CREATE INDEX idx_patient_phone ON patient(phone_no);
CREATE INDEX idx_room_availability ON room(availability);
