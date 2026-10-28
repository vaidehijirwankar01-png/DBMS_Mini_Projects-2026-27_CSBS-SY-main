USE college_placement_db;

-- 1. View all active placement drives with company names
SELECT d.id, c.company_name, d.job_title, d.package, d.location, d.status
FROM placement_drives d
JOIN companies c ON d.company_id = c.id
WHERE d.status = 'active';

-- 2. View all applications for a specific student with drive and company details
SELECT a.id as application_id, c.company_name, d.job_title, a.status as application_status
FROM applications a
JOIN placement_drives d ON a.drive_id = d.id
JOIN companies c ON d.company_id = c.id
WHERE a.student_id = 1;

-- 3. View all applicants for a specific placement drive
SELECT s.enrollment_number, u.name, s.cgpa, a.status
FROM applications a
JOIN students s ON a.student_id = s.id
JOIN users u ON s.user_id = u.id
WHERE a.drive_id = 1;

-- 4. Get placement statistics (total students, total placed, average package)
SELECT 
    COUNT(DISTINCT s.id) as total_students,
    COUNT(DISTINCT sel.student_id) as total_placed,
    AVG(sel.package) as average_package,
    MAX(sel.package) as highest_package
FROM students s
LEFT JOIN selections sel ON s.id = sel.student_id;

-- 5. Get eligible students for a drive based on criteria
-- e.g. for drive id 1: minimum_cgpa = 8.0, maximum_backlogs = 0, eligible_branches='CSE,IT'
SELECT u.name, s.enrollment_number, s.cgpa, dep.code
FROM students s
JOIN users u ON s.user_id = u.id
JOIN departments dep ON s.department_id = dep.id
WHERE s.cgpa >= 8.0 
  AND s.backlogs <= 0
  AND FIND_IN_SET(dep.code, 'CSE,IT') > 0
  AND s.graduation_year = 2024;
