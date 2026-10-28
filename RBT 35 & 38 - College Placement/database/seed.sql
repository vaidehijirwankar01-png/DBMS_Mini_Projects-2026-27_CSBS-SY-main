USE college_placement_db;

-- Admin (password: password)
INSERT INTO users (name, email, password_hash, role) VALUES 
('Admin User', 'admin@college.edu', '$2b$10$i.rm5.cnaeLiIu.HSILsTOQFOPzXOkTvuHLKq39J52bFPwE1TPnQW', 'admin');

-- Departments
INSERT INTO departments (name, code) VALUES 
('Computer Science', 'CSE'),
('Information Technology', 'IT'),
('Electronics and Communication', 'ECE'),
('Mechanical Engineering', 'ME'),
('Electrical Engineering', 'EE');

-- Companies (password: password)
INSERT INTO users (name, email, password_hash, role) VALUES 
('TechCorp HR', 'hr@techcorp.com', '$2b$10$i.rm5.cnaeLiIu.HSILsTOQFOPzXOkTvuHLKq39J52bFPwE1TPnQW', 'company'),
('Innovate Inc HR', 'careers@innovate.inc', '$2b$10$i.rm5.cnaeLiIu.HSILsTOQFOPzXOkTvuHLKq39J52bFPwE1TPnQW', 'company'),
('DataSystems HR', 'recruitment@datasystems.com', '$2b$10$i.rm5.cnaeLiIu.HSILsTOQFOPzXOkTvuHLKq39J52bFPwE1TPnQW', 'company');

INSERT INTO companies (user_id, company_name, description, industry, website, location, contact_email, phone, approval_status) VALUES 
(2, 'TechCorp', 'Leading software solutions provider', 'Software', 'www.techcorp.com', 'Bangalore', 'hr@techcorp.com', '9876543210', 'approved'),
(3, 'Innovate Inc', 'Innovative AI solutions', 'AI', 'www.innovate.inc', 'Hyderabad', 'careers@innovate.inc', '8765432109', 'approved'),
(4, 'DataSystems', 'Data analytics and warehousing', 'Data', 'www.datasystems.com', 'Pune', 'recruitment@datasystems.com', '7654321098', 'approved');

-- Students (password: password)
INSERT INTO users (name, email, password_hash, role) VALUES 
('Alice Smith', 'alice@student.college.edu', '$2b$10$i.rm5.cnaeLiIu.HSILsTOQFOPzXOkTvuHLKq39J52bFPwE1TPnQW', 'student'),
('Bob Jones', 'bob@student.college.edu', '$2b$10$i.rm5.cnaeLiIu.HSILsTOQFOPzXOkTvuHLKq39J52bFPwE1TPnQW', 'student'),
('Charlie Brown', 'charlie@student.college.edu', '$2b$10$i.rm5.cnaeLiIu.HSILsTOQFOPzXOkTvuHLKq39J52bFPwE1TPnQW', 'student'),
('Diana Prince', 'diana@student.college.edu', '$2b$10$i.rm5.cnaeLiIu.HSILsTOQFOPzXOkTvuHLKq39J52bFPwE1TPnQW', 'student'),
('Evan Wright', 'evan@student.college.edu', '$2b$10$i.rm5.cnaeLiIu.HSILsTOQFOPzXOkTvuHLKq39J52bFPwE1TPnQW', 'student');

INSERT INTO students (user_id, enrollment_number, phone, department_id, graduation_year, cgpa, backlogs, resume_url) VALUES 
(5, 'ENR001', '9012345678', 1, 2024, 8.5, 0, 'http://example.com/resume1.pdf'),
(6, 'ENR002', '9012345679', 2, 2024, 7.8, 1, 'http://example.com/resume2.pdf'),
(7, 'ENR003', '9012345680', 3, 2024, 9.2, 0, 'http://example.com/resume3.pdf'),
(8, 'ENR004', '9012345681', 1, 2024, 6.5, 2, 'http://example.com/resume4.pdf'),
(9, 'ENR005', '9012345682', 4, 2024, 8.1, 0, 'http://example.com/resume5.pdf');

-- Placement Drives
INSERT INTO placement_drives (company_id, job_title, job_description, package, location, minimum_cgpa, maximum_backlogs, eligible_branches, graduation_year, application_deadline, drive_date, status) VALUES 
(1, 'Software Engineer', 'Develop amazing software', 12.00, 'Bangalore', 8.0, 0, 'CSE,IT', 2024, '2026-11-01 23:59:59', '2026-11-15 09:00:00', 'active'),
(2, 'Data Analyst', 'Analyze big data', 10.00, 'Hyderabad', 7.5, 1, 'CSE,IT,ECE', 2024, '2026-11-05 23:59:59', '2026-11-20 09:00:00', 'active'),
(3, 'Mechanical Engineer', 'Design mechanical systems', 8.00, 'Pune', 7.0, 2, 'ME', 2024, '2026-11-10 23:59:59', '2026-11-25 09:00:00', 'upcoming');

-- Applications
INSERT INTO applications (student_id, drive_id, status) VALUES 
(1, 1, 'Applied'),
(1, 2, 'Shortlisted'),
(3, 1, 'Interview'),
(5, 3, 'Applied');
