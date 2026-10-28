-- =============================================================================
-- COLLEGE MANAGEMENT SYSTEM — USER AND PRIVILEGE MANAGEMENT
-- Demonstrates: CREATE USER, GRANT, REVOKE, and SHOW GRANTS
-- Compatible with: MySQL 8.x and MySQL Workbench
-- NOTE: Execute this script using an Administrator account (e.g., 'root')
-- =============================================================================

USE college_management;

-- -----------------------------------------------------------------------------
-- 1. DROP EXISTING USERS (If already created, for clean idempotent execution)
-- -----------------------------------------------------------------------------
DROP USER IF EXISTS 'college_app_user'@'localhost';
DROP USER IF EXISTS 'college_admin'@'localhost';
DROP USER IF EXISTS 'college_faculty'@'localhost';
DROP USER IF EXISTS 'college_clerk'@'localhost';
DROP USER IF EXISTS 'college_reader'@'localhost';

-- -----------------------------------------------------------------------------
-- 2. CREATE DATABASE USERS WITH LEAST PRIVILEGE
-- -----------------------------------------------------------------------------

-- Account 1: Dedicated Web Application User (Used by Flask backend)
CREATE USER 'college_app_user'@'localhost' 
IDENTIFIED BY '987654321';

-- Account 2: Full Database Administrator
CREATE USER 'college_admin'@'localhost' 
IDENTIFIED BY 'YOUR_ADMIN_PASSWORD';

-- Account 3: Faculty Role (Academic Records Only)
CREATE USER 'college_faculty'@'localhost' 
IDENTIFIED BY 'YOUR_FACULTY_PASSWORD';

-- Account 4: Clerk Role (Student & Fee Records Only)
CREATE USER 'college_clerk'@'localhost' 
IDENTIFIED BY 'YOUR_CLERK_PASSWORD';

-- Account 5: Read-Only Audit User
CREATE USER 'college_reader'@'localhost' 
IDENTIFIED BY 'YOUR_READER_PASSWORD';


-- -----------------------------------------------------------------------------
-- 3. GRANT STATEMENTS (Assigning Specific Role-Based Permissions)
-- -----------------------------------------------------------------------------

-- 3.1 Web Application User: Needs DML (CRUD), procedure execution, and views
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW 
ON college_management.* 
TO 'college_app_user'@'localhost';

-- 3.2 Database Administrator: Full DBA privileges with grant option
GRANT ALL PRIVILEGES 
ON college_management.* 
TO 'college_admin'@'localhost' 
WITH GRANT OPTION;

-- 3.3 Faculty Account: Access to courses, enrollments, attendance, exams, results
GRANT SELECT ON college_management.* TO 'college_faculty'@'localhost';
GRANT INSERT, UPDATE ON college_management.attendance TO 'college_faculty'@'localhost';
GRANT INSERT, UPDATE ON college_management.examinations TO 'college_faculty'@'localhost';
GRANT INSERT, UPDATE ON college_management.results TO 'college_faculty'@'localhost';

-- 3.4 Clerk Account: Access to student profiles and fee collection
GRANT SELECT ON college_management.departments TO 'college_clerk'@'localhost';
GRANT SELECT, INSERT, UPDATE ON college_management.students TO 'college_clerk'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON college_management.fees TO 'college_clerk'@'localhost';

-- 3.5 Read-Only User: Reporting and audit inspection only
GRANT SELECT, SHOW VIEW 
ON college_management.* 
TO 'college_reader'@'localhost';


-- -----------------------------------------------------------------------------
-- 4. REVOKE STATEMENTS (Least-Privilege Enforcement Demonstration)
-- -----------------------------------------------------------------------------

-- Demonstration 4.1: Clerk should NOT be allowed to delete fee audit trails
REVOKE DELETE 
ON college_management.fees 
FROM 'college_clerk'@'localhost';

-- Demonstration 4.2: Revoke any accidental table drop permissions from app user
REVOKE DROP, ALTER 
ON college_management.* 
FROM 'college_app_user'@'localhost';


-- -----------------------------------------------------------------------------
-- 5. RELOAD PRIVILEGE TABLES
-- -----------------------------------------------------------------------------
FLUSH PRIVILEGES;


-- -----------------------------------------------------------------------------
-- 6. VERIFY PRIVILEGES USING SHOW GRANTS
-- -----------------------------------------------------------------------------
SHOW GRANTS FOR 'college_app_user'@'localhost';
SHOW GRANTS FOR 'college_admin'@'localhost';
SHOW GRANTS FOR 'college_faculty'@'localhost';
SHOW GRANTS FOR 'college_clerk'@'localhost';
SHOW GRANTS FOR 'college_reader'@'localhost';
