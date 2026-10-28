-- =============================================================================
-- COLLEGE MANAGEMENT SYSTEM — DDL DEMONSTRATION SCRIPT
-- Demonstrates: ALTER TABLE, TRUNCATE TABLE, and DROP TABLE
-- Database Name: college_management
-- =============================================================================

USE college_management;

-- -----------------------------------------------------------------------------
-- 1. ALTER TABLE DEMONSTRATIONS
-- -----------------------------------------------------------------------------

-- Example 1.1: Add a new column 'blood_group' to students table
ALTER TABLE students 
ADD COLUMN blood_group VARCHAR(5) DEFAULT 'O+' AFTER gender;

-- Verify addition
DESCRIBE students;

-- Example 1.2: Modify column data type / constraint
ALTER TABLE students 
MODIFY COLUMN blood_group VARCHAR(10) DEFAULT 'Unknown';

-- Example 1.3: Drop the demonstration column to maintain clean schema
ALTER TABLE students 
DROP COLUMN blood_group;

-- Example 1.4: Add an index for faster lookup on student names
ALTER TABLE students 
ADD INDEX idx_student_name (full_name);

-- Example 1.5: Drop the index
ALTER TABLE students 
DROP INDEX idx_student_name;


-- -----------------------------------------------------------------------------
-- 2. CREATE TEMPORARY DEMO TABLE FOR TRUNCATE AND DROP DEMOS
-- -----------------------------------------------------------------------------

-- Create a demo table
CREATE TABLE IF NOT EXISTS ddl_demo_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insert sample records
INSERT INTO ddl_demo_logs (event_name) VALUES 
('System Startup Check'),
('Database Heartbeat Ping'),
('Backup Log Initialized');

-- View data before TRUNCATE
SELECT * FROM ddl_demo_logs;


-- -----------------------------------------------------------------------------
-- 3. TRUNCATE TABLE DEMONSTRATION
-- Fast DDL operation: Removes all rows and resets AUTO_INCREMENT to 1
-- -----------------------------------------------------------------------------

TRUNCATE TABLE ddl_demo_logs;

-- Verify table is empty and counter reset
SELECT * FROM ddl_demo_logs;


-- -----------------------------------------------------------------------------
-- 4. DROP TABLE DEMONSTRATION
-- DDL operation: Permanently removes the table structure and its data
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS ddl_demo_logs;

-- Verify drop (will return table doesn't exist error if queried)
-- SELECT * FROM ddl_demo_logs;
