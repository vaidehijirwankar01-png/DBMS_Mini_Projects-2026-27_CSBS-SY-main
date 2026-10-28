-- =====================================================================
-- TrackMate Safe Database Migration: 01_safe_schema_update.sql
-- PURPOSE: Apply schema upgrades, indexes, and constraints to an
--          EXISTING trackmate_db without dropping or deleting data.
-- =====================================================================

USE trackmate_db;

-- 1. Ensure user_profile has all semester goal and tracking columns
-- Safe column addition (checking existence before alter)
SET @dbname = DATABASE();
SET @tablename = "user_profile";

-- Add semester_goal_hours if missing
SET @columnname = "semester_goal_hours";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE user_profile ADD COLUMN semester_goal_hours DECIMAL(6,1) DEFAULT 300.0;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add semester_start if missing
SET @columnname = "semester_start";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE user_profile ADD COLUMN semester_start DATE NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add semester_end if missing
SET @columnname = "semester_end";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE user_profile ADD COLUMN semester_end DATE NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Verify Study_Tasks supporting table exists
CREATE TABLE IF NOT EXISTS Study_Tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    subject_id INT NULL,
    due_date DATE NULL,
    priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
    status ENUM('Pending', 'Completed') NOT NULL DEFAULT 'Pending',
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_study_tasks_subject
        FOREIGN KEY (subject_id)
        REFERENCES Subjects(subject_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3. Verify Exams table exists
CREATE TABLE IF NOT EXISTS Exams (
    exam_id INT AUTO_INCREMENT PRIMARY KEY,
    exam_name VARCHAR(150) NOT NULL,
    subject_id INT NULL,
    exam_date DATE NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_exams_subject
        FOREIGN KEY (subject_id)
        REFERENCES Subjects(subject_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. Verify Notes table exists
CREATE TABLE IF NOT EXISTS Notes (
    note_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    subject_id INT NULL,
    tags VARCHAR(255) DEFAULT '',
    is_pinned TINYINT(1) DEFAULT 0,
    color VARCHAR(30) DEFAULT 'purple',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notes_subject
        FOREIGN KEY (subject_id)
        REFERENCES Subjects(subject_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 5. Verify Flashcards table exists
CREATE TABLE IF NOT EXISTS Flashcards (
    flashcard_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NULL,
    note_id INT NULL,
    deck_name VARCHAR(100) NOT NULL DEFAULT 'General',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    hint VARCHAR(255) DEFAULT '',
    mastery_level ENUM('New', 'Learning', 'Review', 'Mastered') DEFAULT 'New',
    times_reviewed INT DEFAULT 0,
    last_reviewed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_flashcards_subject
        FOREIGN KEY (subject_id)
        REFERENCES Subjects(subject_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_flashcards_note
        FOREIGN KEY (note_id)
        REFERENCES Notes(note_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 6. Ensure default user_profile record (ID=1) exists if table is empty
INSERT IGNORE INTO user_profile 
(id, full_name, email, college, major, semester, daily_goal_hours, weekly_goal_hours, semester_goal_hours, theme) 
VALUES (1, 'Alex Morgan', 'alex.morgan@university.edu', 'Faculty of Engineering & Technology', 'Computer Science', 'Semester 5', 4.0, 25.0, 300.0, 'dark');

SELECT 'TrackMate safe migration completed successfully. Existing records were 100% preserved.' AS status;
