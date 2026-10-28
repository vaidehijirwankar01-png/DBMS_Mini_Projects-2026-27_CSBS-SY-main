-- =====================================================================
-- TrackMate Safe Database Migration: 02_multi_user_auth_migration.sql
-- PURPOSE: Implement multi-user authentication and per-user data isolation
--          in an EXISTING trackmate_db without dropping tables or losing data.
-- =====================================================================

USE trackmate_db;

-- 1. Create the users table if it does not already exist
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Seed legacy demo user account if users table is empty
-- Password: DemoPassword123! (hashed using Werkzeug-compatible PBKDF2:SHA256)
INSERT IGNORE INTO users (user_id, name, email, password_hash)
VALUES (
    1,
    'Alex Morgan',
    'demo@trackmate.edu',
    'pbkdf2:sha256:260000$c723476143eacfca$af28dbe04f972197212b4eca1da615115635bd86141961b6fa2680bf66e8ee30'
);

-- =====================================================================
-- 3. Safely add user_id column to personal tables if not already present
-- =====================================================================
SET @dbname = DATABASE();

-- ---------------------------------------------------------------------
-- Table: Subjects (user_id IS NULL for curriculum defaults, INT for custom)
-- ---------------------------------------------------------------------
SET @tablename = "Subjects";
SET @columnname = "user_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Subjects ADD COLUMN user_id INT NULL;"
));
PREPARE alterSubjects FROM @preparedStatement;
EXECUTE alterSubjects;
DEALLOCATE PREPARE alterSubjects;

-- ---------------------------------------------------------------------
-- Table: Study_Sessions
-- ---------------------------------------------------------------------
SET @tablename = "Study_Sessions";
SET @columnname = "user_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Study_Sessions ADD COLUMN user_id INT NULL;"
));
PREPARE alterSessions FROM @preparedStatement;
EXECUTE alterSessions;
DEALLOCATE PREPARE alterSessions;

-- Backfill existing orphan study sessions to user 1
UPDATE Study_Sessions SET user_id = 1 WHERE user_id IS NULL;

-- ---------------------------------------------------------------------
-- Table: Habits
-- ---------------------------------------------------------------------
SET @tablename = "Habits";
SET @columnname = "user_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Habits ADD COLUMN user_id INT NULL;"
));
PREPARE alterHabits FROM @preparedStatement;
EXECUTE alterHabits;
DEALLOCATE PREPARE alterHabits;

-- Backfill existing orphan habits to user 1
UPDATE Habits SET user_id = 1 WHERE user_id IS NULL;

-- ---------------------------------------------------------------------
-- Table: Habit_Logs
-- ---------------------------------------------------------------------
SET @tablename = "Habit_Logs";
SET @columnname = "user_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Habit_Logs ADD COLUMN user_id INT NULL;"
));
PREPARE alterHabitLogs FROM @preparedStatement;
EXECUTE alterHabitLogs;
DEALLOCATE PREPARE alterHabitLogs;

-- Backfill existing orphan habit logs to user 1
UPDATE Habit_Logs SET user_id = 1 WHERE user_id IS NULL;

-- ---------------------------------------------------------------------
-- Table: Study_Tasks
-- ---------------------------------------------------------------------
SET @tablename = "Study_Tasks";
SET @columnname = "user_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Study_Tasks ADD COLUMN user_id INT NULL;"
));
PREPARE alterTasks FROM @preparedStatement;
EXECUTE alterTasks;
DEALLOCATE PREPARE alterTasks;

-- Backfill existing orphan tasks to user 1
UPDATE Study_Tasks SET user_id = 1 WHERE user_id IS NULL;

-- ---------------------------------------------------------------------
-- Table: Exams
-- ---------------------------------------------------------------------
SET @tablename = "Exams";
SET @columnname = "user_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Exams ADD COLUMN user_id INT NULL;"
));
PREPARE alterExams FROM @preparedStatement;
EXECUTE alterExams;
DEALLOCATE PREPARE alterExams;

-- Backfill existing orphan exams to user 1
UPDATE Exams SET user_id = 1 WHERE user_id IS NULL;

-- ---------------------------------------------------------------------
-- Table: Notes
-- ---------------------------------------------------------------------
SET @tablename = "Notes";
SET @columnname = "user_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Notes ADD COLUMN user_id INT NULL;"
));
PREPARE alterNotes FROM @preparedStatement;
EXECUTE alterNotes;
DEALLOCATE PREPARE alterNotes;

-- Backfill existing orphan notes to user 1
UPDATE Notes SET user_id = 1 WHERE user_id IS NULL;

-- ---------------------------------------------------------------------
-- Table: Flashcards
-- ---------------------------------------------------------------------
SET @tablename = "Flashcards";
SET @columnname = "user_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Flashcards ADD COLUMN user_id INT NULL;"
));
PREPARE alterCards FROM @preparedStatement;
EXECUTE alterCards;
DEALLOCATE PREPARE alterCards;

-- Backfill existing orphan flashcards to user 1
UPDATE Flashcards SET user_id = 1 WHERE user_id IS NULL;

-- ---------------------------------------------------------------------
-- Table: user_profile (ensure user_id column links directly to users.user_id)
-- ---------------------------------------------------------------------
SET @tablename = "user_profile";
SET @columnname = "user_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE user_profile ADD COLUMN user_id INT NULL;"
));
PREPARE alterProfile FROM @preparedStatement;
EXECUTE alterProfile;
DEALLOCATE PREPARE alterProfile;

-- Backfill user_id = id where user_id IS NULL in user_profile
UPDATE user_profile SET user_id = id WHERE user_id IS NULL;

-- =====================================================================
-- 4. Foreign Key Constraints (Safe conditional addition)
-- =====================================================================

-- Foreign Key: Study_Sessions -> users
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @dbname
      AND TABLE_NAME = 'Study_Sessions'
      AND CONSTRAINT_NAME = 'fk_study_sessions_user'
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Study_Sessions ADD CONSTRAINT fk_study_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;"
));
PREPARE addFkSessions FROM @preparedStatement;
EXECUTE addFkSessions;
DEALLOCATE PREPARE addFkSessions;

-- Foreign Key: Habits -> users
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @dbname
      AND TABLE_NAME = 'Habits'
      AND CONSTRAINT_NAME = 'fk_habits_user'
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Habits ADD CONSTRAINT fk_habits_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;"
));
PREPARE addFkHabits FROM @preparedStatement;
EXECUTE addFkHabits;
DEALLOCATE PREPARE addFkHabits;

-- Foreign Key: Habit_Logs -> users
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @dbname
      AND TABLE_NAME = 'Habit_Logs'
      AND CONSTRAINT_NAME = 'fk_habit_logs_user'
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Habit_Logs ADD CONSTRAINT fk_habit_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;"
));
PREPARE addFkHabitLogs FROM @preparedStatement;
EXECUTE addFkHabitLogs;
DEALLOCATE PREPARE addFkHabitLogs;

-- Foreign Key: Study_Tasks -> users
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @dbname
      AND TABLE_NAME = 'Study_Tasks'
      AND CONSTRAINT_NAME = 'fk_study_tasks_user'
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Study_Tasks ADD CONSTRAINT fk_study_tasks_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;"
));
PREPARE addFkTasks FROM @preparedStatement;
EXECUTE addFkTasks;
DEALLOCATE PREPARE addFkTasks;

-- Foreign Key: Exams -> users
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @dbname
      AND TABLE_NAME = 'Exams'
      AND CONSTRAINT_NAME = 'fk_exams_user'
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Exams ADD CONSTRAINT fk_exams_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;"
));
PREPARE addFkExams FROM @preparedStatement;
EXECUTE addFkExams;
DEALLOCATE PREPARE addFkExams;

-- Foreign Key: Notes -> users
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @dbname
      AND TABLE_NAME = 'Notes'
      AND CONSTRAINT_NAME = 'fk_notes_user'
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Notes ADD CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;"
));
PREPARE addFkNotes FROM @preparedStatement;
EXECUTE addFkNotes;
DEALLOCATE PREPARE addFkNotes;

-- Foreign Key: Flashcards -> users
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @dbname
      AND TABLE_NAME = 'Flashcards'
      AND CONSTRAINT_NAME = 'fk_flashcards_user'
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Flashcards ADD CONSTRAINT fk_flashcards_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;"
));
PREPARE addFkCards FROM @preparedStatement;
EXECUTE addFkCards;
DEALLOCATE PREPARE addFkCards;

-- Foreign Key: Subjects -> users
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = @dbname
      AND TABLE_NAME = 'Subjects'
      AND CONSTRAINT_NAME = 'fk_subjects_user'
  ) > 0,
  "SELECT 1",
  "ALTER TABLE Subjects ADD CONSTRAINT fk_subjects_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;"
));
PREPARE addFkSubjects FROM @preparedStatement;
EXECUTE addFkSubjects;
DEALLOCATE PREPARE addFkSubjects;

-- =====================================================================
-- 5. Performance Indexes on user_id columns
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_sessions_user ON Study_Sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user ON Habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user ON Habit_Logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON Study_Tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_user ON Exams(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON Notes(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user ON Flashcards(user_id);

SELECT 'TrackMate multi-user authentication migration completed successfully. Zero existing records lost.' AS migration_status;
