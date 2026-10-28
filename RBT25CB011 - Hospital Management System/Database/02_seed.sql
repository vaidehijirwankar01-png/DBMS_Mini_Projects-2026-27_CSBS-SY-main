-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM - SEED DATA (DML)
-- Step 2: Comprehensive Demonstration Data for Evaluation & Viva Testing
-- ============================================================================

USE hospital_db;

-- Safely clear previous data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_log;
TRUNCATE TABLE bill;
TRUNCATE TABLE appointment;
TRUNCATE TABLE patient;
TRUNCATE TABLE room;
TRUNCATE TABLE doctor;
TRUNCATE TABLE department;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users
INSERT INTO users (username, password_hash, role) VALUES
('admin', 'scrypt:32768:8:1$uB8Q4J9L1X$a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890', 'Admin'),
('receptionist', 'scrypt:32768:8:1$uB8Q4J9L1X$a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890', 'Staff');

-- 2. Departments
INSERT INTO department (department_id, department_name, floor, hod) VALUES
(1, 'Cardiology', 3, 'Dr. Rajesh Sharma'),
(2, 'Neurology', 4, 'Dr. Sunita Deshmukh'),
(3, 'Orthopedics', 2, 'Dr. Anil Kulkarni'),
(4, 'Pediatrics', 1, 'Dr. Meera Patil'),
(5, 'General Medicine', 1, 'Dr. Vikram Joshi');

-- 3. Doctors
INSERT INTO doctor (doctor_id, name, specialization, phone_no, salary, experience, department_id) VALUES
(1, 'Dr. Rajesh Sharma', 'Interventional Cardiology', '9822011101', 185000.00, 15, 1),
(2, 'Dr. Priya Nair', 'Electrophysiology', '9822011102', 140000.00, 8, 1),
(3, 'Dr. Sunita Deshmukh', 'Neurosurgeon', '9822011103', 210000.00, 18, 2),
(4, 'Dr. Amit Shah', 'Neurologist', '9822011104', 135000.00, 7, 2),
(5, 'Dr. Anil Kulkarni', 'Orthopedic Surgeon', '9822011105', 160000.00, 12, 3),
(6, 'Dr. Sneha Roy', 'Pediatrician', '9822011106', 115000.00, 6, 4),
(7, 'Dr. Meera Patil', 'Pediatric Cardiology', '9822011107', 150000.00, 10, 4),
(8, 'Dr. Vikram Joshi', 'General Physician', '9822011108', 125000.00, 9, 5);

-- 4. Rooms
INSERT INTO room (room_no, room_type, charges, availability) VALUES
(101, 'General', 1200.00, 'Occupied'),
(102, 'General', 1200.00, 'Available'),
(103, 'General', 1200.00, 'Available'),
(201, 'Semi-Private', 2500.00, 'Occupied'),
(202, 'Semi-Private', 2500.00, 'Occupied'),
(301, 'Private', 5000.00, 'Occupied'),
(302, 'Private', 5000.00, 'Available'),
(401, 'ICU', 10000.00, 'Occupied'),
(402, 'ICU', 10000.00, 'Occupied'),
(403, 'ICU', 10000.00, 'Maintenance');

-- 5. Patients
INSERT INTO patient (patient_id, name, age, gender, phone_no, address, room_no) VALUES
(1, 'Ramesh Pawar', 45, 'Male', '9765012301', 'Kothrud, Pune', 101),
(2, 'Sita Verma', 32, 'Female', '9765012302', 'Viman Nagar, Pune', NULL),
(3, 'Aarav Gupta', 8, 'Male', '9765012303', 'Aundh, Pune', NULL),
(4, 'Sunita Rao', 58, 'Female', '9765012304', 'Baner, Pune', 201),
(5, 'Vijay Kale', 62, 'Male', '9765012305', 'Tathawade, Pune', 401),
(6, 'Pooja Mehta', 27, 'Female', '9765012306', 'Wakad, Pune', NULL),
(7, 'Ganesh Shinde', 51, 'Male', '9765012307', 'Hinjewadi, Pune', 202),
(8, 'Kavita Jadhav', 39, 'Female', '9765012308', 'Pimple Saudagar, Pune', NULL),
(9, 'Rahul Dravid', 48, 'Male', '9765012309', 'Shivajinagar, Pune', 301),
(10, 'Ananya Birje', 22, 'Female', '9765012310', 'Hadapsar, Pune', NULL),
(11, 'Suresh Gadgil', 70, 'Male', '9765012311', 'Pashan, Pune', 402),
(12, 'Neha Agarwal', 34, 'Female', '9765012312', 'Kharadi, Pune', NULL),
(13, 'Manoj Tiwari', 41, 'Male', '9765012313', 'Bavdhan, Pune', NULL),
(14, 'Swati Kadam', 29, 'Female', '9765012314', 'Chinchwad, Pune', NULL),
(15, 'Prakash More', 66, 'Male', '9765012315', 'Nigdi, Pune', NULL);

-- 6. Appointments
INSERT INTO appointment (appointment_id, patient_id, doctor_id, date, time, status) VALUES
(1, 1, 1, '2026-10-20', '10:00:00', 'Completed'),
(2, 2, 2, '2026-10-20', '11:00:00', 'Completed'),
(3, 3, 6, '2026-10-21', '09:30:00', 'Completed'),
(4, 4, 3, '2026-10-21', '10:30:00', 'Completed'),
(5, 5, 1, '2026-10-21', '12:00:00', 'Scheduled'),
(6, 6, 8, '2026-10-22', '10:00:00', 'Scheduled'),
(7, 7, 5, '2026-10-22', '11:30:00', 'Scheduled'),
(8, 8, 4, '2026-10-22', '14:00:00', 'Scheduled'),
(9, 9, 3, '2026-10-23', '09:00:00', 'Scheduled'),
(10, 10, 8, '2026-10-23', '10:30:00', 'Scheduled'),
(11, 11, 1, '2026-10-23', '11:30:00', 'Scheduled'),
(12, 12, 7, '2026-10-24', '10:00:00', 'Cancelled'),
(13, 13, 5, '2026-10-24', '11:00:00', 'Scheduled'),
(14, 14, 2, '2026-10-25', '15:00:00', 'Scheduled'),
(15, 15, 8, '2026-10-25', '16:00:00', 'Scheduled');

-- 7. Bills
INSERT INTO bill (bill_id, patient_id, amount, payment_mode, payment_status, date) VALUES
(1, 1, 4700.00, 'UPI', 'Paid', '2026-10-20'),
(2, 2, 800.00, 'Cash', 'Paid', '2026-10-20'),
(3, 3, 600.00, 'Card', 'Paid', '2026-10-21'),
(4, 4, 12500.00, 'Insurance', 'Partially Paid', '2026-10-21'),
(5, 5, 35000.00, 'Pending', 'Pending', '2026-10-21'),
(6, 6, 750.00, 'Pending', 'Pending', '2026-10-22'),
(7, 7, 8500.00, 'UPI', 'Paid', '2026-10-22'),
(8, 8, 1200.00, 'Pending', 'Pending', '2026-10-22'),
(9, 9, 22000.00, 'Card', 'Paid', '2026-10-23'),
(10, 10, 500.00, 'UPI', 'Paid', '2026-10-23'),
(11, 11, 42000.00, 'Pending', 'Pending', '2026-10-23'),
(12, 12, 0.00, 'Pending', 'Pending', '2026-10-24'),
(13, 13, 1500.00, 'Cash', 'Paid', '2026-10-24'),
(14, 14, 900.00, 'Pending', 'Pending', '2026-10-25'),
(15, 15, 750.00, 'Pending', 'Pending', '2026-10-25');
