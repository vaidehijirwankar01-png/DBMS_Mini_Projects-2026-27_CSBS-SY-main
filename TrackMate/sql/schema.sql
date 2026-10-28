-- =====================================================================
-- TrackMate: Database Schema & Seed Data
-- Database Name: trackmate_db
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =====================================================================

CREATE DATABASE IF NOT EXISTS trackmate_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE trackmate_db;

-- ---------------------------------------------------------------------
-- Table: users
-- Secure multi-user authentication store
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table: Subjects
-- Stores user's academic courses and topics of study (user_id NULL = shared)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Subjects (
    subject_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    subject_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_subjects_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table: Study_Sessions
-- Records dedicated study intervals with duration and notes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Study_Sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    subject_id INT NOT NULL,
    topic VARCHAR(255) NOT NULL,
    study_date DATE NOT NULL,
    start_time TIME NULL,
    duration_minutes INT NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_study_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_study_sessions_subject
        FOREIGN KEY (subject_id)
        REFERENCES Subjects(subject_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_sessions_user ON Study_Sessions(user_id);
CREATE INDEX idx_sessions_date ON Study_Sessions(study_date);
CREATE INDEX idx_sessions_subject ON Study_Sessions(subject_id);

-- ---------------------------------------------------------------------
-- Table: Habits
-- Daily and weekly habits that the student commits to
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Habits (
    habit_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    habit_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    frequency ENUM('Daily', 'Weekly') NOT NULL DEFAULT 'Daily',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_habits_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_habits_user ON Habits(user_id);

-- ---------------------------------------------------------------------
-- Table: Habit_Logs
-- Daily completion tracking for habits (Unique on habit_id + log_date)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Habit_Logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    habit_id INT NOT NULL,
    log_date DATE NOT NULL,
    completed TINYINT(1) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_habit_date UNIQUE (habit_id, log_date),
    CONSTRAINT fk_habit_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_habit_logs_habit
        FOREIGN KEY (habit_id)
        REFERENCES Habits(habit_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_habit_logs_user ON Habit_Logs(user_id);
CREATE INDEX idx_habit_logs_date ON Habit_Logs(log_date);

-- ---------------------------------------------------------------------
-- Table: user_profile
-- Student profile, study goals, semester boundaries, and preferences
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profile (
    id INT PRIMARY KEY DEFAULT 1,
    user_id INT NULL,
    full_name VARCHAR(100) DEFAULT 'Alex Morgan',
    email VARCHAR(120) DEFAULT 'alex.morgan@university.edu',
    college VARCHAR(150) DEFAULT 'Faculty of Engineering & Technology',
    major VARCHAR(100) DEFAULT 'Computer Science',
    semester VARCHAR(50) DEFAULT 'Semester 5',
    daily_goal_hours DECIMAL(4,1) DEFAULT 4.0,
    weekly_goal_hours DECIMAL(4,1) DEFAULT 25.0,
    semester_goal_hours DECIMAL(6,1) DEFAULT 300.0,
    semester_start DATE NULL,
    semester_end DATE NULL,
    theme VARCHAR(20) DEFAULT 'dark',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_profile_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Table: Study_Tasks (Planner)
-- Actionable tasks, deadlines, and backlog items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Study_Tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    subject_id INT NULL,
    due_date DATE NULL,
    priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
    status ENUM('Pending', 'Completed') NOT NULL DEFAULT 'Pending',
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_study_tasks_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_study_tasks_subject
        FOREIGN KEY (subject_id)
        REFERENCES Subjects(subject_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_tasks_user ON Study_Tasks(user_id);
CREATE INDEX idx_tasks_due_date ON Study_Tasks(due_date);
CREATE INDEX idx_tasks_status ON Study_Tasks(status);

-- ---------------------------------------------------------------------
-- Table: Exams
-- Examination schedule and countdown tracker
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Exams (
    exam_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    exam_name VARCHAR(150) NOT NULL,
    subject_id INT NULL,
    exam_date DATE NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_exams_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_exams_subject
        FOREIGN KEY (subject_id)
        REFERENCES Subjects(subject_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_exams_user ON Exams(user_id);
CREATE INDEX idx_exams_date ON Exams(exam_date);

-- ---------------------------------------------------------------------
-- Table: Notes
-- Course notes, concepts, and markdown revision documents
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Notes (
    note_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    title VARCHAR(200) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    subject_id INT NULL,
    tags VARCHAR(255) DEFAULT '',
    is_pinned TINYINT(1) DEFAULT 0,
    color VARCHAR(30) DEFAULT 'purple',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notes_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notes_subject
        FOREIGN KEY (subject_id)
        REFERENCES Subjects(subject_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_notes_user ON Notes(user_id);

-- ---------------------------------------------------------------------
-- Table: Flashcards
-- Spaced-repetition study flashcards linked to subjects and notes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Flashcards (
    flashcard_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
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
    CONSTRAINT fk_flashcards_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
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

CREATE INDEX idx_flashcards_user ON Flashcards(user_id);

-- =====================================================================
-- SEED DATA
-- Default college student curriculum, demo account, and active starter habits
-- =====================================================================

-- Seed default user account (password: DemoPassword123!)
INSERT IGNORE INTO users (user_id, name, email, password_hash) VALUES
(1, 'Alex Morgan', 'demo@trackmate.edu', 'pbkdf2:sha256:260000$c723476143eacfca$af28dbe04f972197212b4eca1da615115635bd86141961b6fa2680bf66e8ee30');

INSERT IGNORE INTO user_profile (id, user_id, full_name, email, college, major, semester, daily_goal_hours, weekly_goal_hours, semester_goal_hours)
VALUES (1, 1, 'Alex Morgan', 'alex.morgan@university.edu', 'Faculty of Engineering & Technology', 'Computer Science', 'Semester 5', 4.0, 25.0, 300.0);

INSERT IGNORE INTO Subjects (subject_id, user_id, subject_name) VALUES
(1, 1, 'Database Management System'),
(2, 1, 'Java'),
(3, 1, 'Data Structures and Algorithms'),
(4, 1, 'Operating System'),
(5, 1, 'Software Engineering and Quality Assurance');

INSERT IGNORE INTO Habits (habit_id, user_id, habit_name, description, frequency, is_active) VALUES
(1, 1, 'Solve 1 LeetCode Problem', 'Practice algorithmic problem solving daily on LeetCode / HackerRank', 'Daily', 1),
(2, 1, 'Read Technical Documentation (20m)', 'Read official documentation, RFCs, or engineering blog posts', 'Daily', 1),
(3, 1, 'Review Lecture Notes', 'Active recall summary of topics taught in today lectures', 'Daily', 1),
(4, 1, 'Daily Pomodoro Deep Work Block', 'Complete at least 2 uninterrupted 25-minute Pomodoro focus sprints', 'Daily', 1),
(5, 1, 'Hydration & Posture Reset', 'Drink 2L water and complete 5-minute stretch routine', 'Daily', 1);

-- Initial study sessions to jumpstart analytics
INSERT IGNORE INTO Study_Sessions (session_id, user_id, subject_id, topic, study_date, start_time, duration_minutes, notes) VALUES
(1, 1, 1, 'Normalization (1NF, 2NF, 3NF, BCNF)', CURDATE(), '09:00:00', 90, 'Reviewed functional dependencies and loss-less join decomposition.'),
(2, 1, 2, 'Java Multithreading & Synchronization', CURDATE(), '11:15:00', 75, 'Implemented Thread class, Runnable interface, and synchronized blocks.'),
(3, 1, 3, 'Binary Search Trees & Balancing (AVL Trees)', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '14:00:00', 120, 'Practiced tree rotations and node deletion algorithms.'),
(4, 1, 4, 'Process Scheduling & Deadlock Detection', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '10:30:00', 90, 'Bankers algorithm problems and round robin timing charts.'),
(5, 1, 5, 'Agile Methodologies & Unit Testing Patterns', DATE_SUB(CURDATE(), INTERVAL 3 DAY), '16:00:00', 60, 'JUnit testing frameworks and Test-Driven Development cycles.');

-- Sample planner tasks
INSERT IGNORE INTO Study_Tasks (task_id, user_id, title, description, subject_id, due_date, priority, status) VALUES
(1, 1, 'Complete SQL Lab Assignment 4', 'Write complex JOIN queries and aggregate views for library database', 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'High', 'Pending'),
(2, 1, 'Implement Generic Stack in Java', 'Generic class supporting push, pop, peek, and capacity resize', 2, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Medium', 'Pending'),
(3, 1, 'Graph Traversal Practice (BFS & DFS)', 'Solve 3 graph cycle detection problems in Python/Java', 3, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'High', 'Pending'),
(4, 1, 'Review Virtual Memory Paging Algorithms', 'FIFO, LRU, and Optimal page replacement practice questions', 4, DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Medium', 'Pending');

-- Sample upcoming exams
INSERT IGNORE INTO Exams (exam_id, user_id, exam_name, subject_id, exam_date, notes) VALUES
(1, 1, 'Mid-Semester DBMS Theory Exam', 1, DATE_ADD(CURDATE(), INTERVAL 8 DAY), 'Covers ER diagrams, Relational Algebra, SQL, and Normalization.'),
(2, 1, 'Data Structures Practical Lab Exam', 3, DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'In-person coding test on Trees, Heaps, and Graph algorithms.'),
(3, 1, 'Operating Systems Unit Assessment', 4, DATE_ADD(CURDATE(), INTERVAL 21 DAY), 'Multiple-choice and calculation problems on CPU scheduling & Semaphore locks.');

-- Initial 30-day Habit Logs to support long-term consistency analysis
INSERT IGNORE INTO Habit_Logs (habit_id, user_id, log_date, completed, notes)
SELECT h.habit_id, 1, d.log_date,
       CASE 
         WHEN (h.habit_id = 1 AND MOD(d.day_offset, 5) != 0) THEN 1
         WHEN (h.habit_id = 2 AND MOD(d.day_offset, 4) != 1) THEN 1
         WHEN (h.habit_id = 3 AND MOD(d.day_offset, 7) != 2) THEN 1
         WHEN (h.habit_id = 4 AND MOD(d.day_offset, 10) != 3) THEN 1
         WHEN (h.habit_id = 5 AND MOD(d.day_offset, 14) != 4) THEN 1
         ELSE 0
       END AS completed,
       CASE 
         WHEN h.habit_id = 1 AND MOD(d.day_offset, 5) != 0 THEN 'Solved daily algorithmic problem on LeetCode'
         WHEN h.habit_id = 2 AND MOD(d.day_offset, 4) != 1 THEN 'Read 20m software architecture & technical docs'
         WHEN h.habit_id = 3 AND MOD(d.day_offset, 7) != 2 THEN 'Reviewed lecture slides & active recall notes'
         WHEN h.habit_id = 4 AND MOD(d.day_offset, 10) != 3 THEN 'Completed 2x25m focused Pomodoro deep work sprints'
         WHEN h.habit_id = 5 AND MOD(d.day_offset, 14) != 4 THEN 'Hydration target 2.5L and posture stretch achieved'
         ELSE 'Rest day / academic sprint'
       END AS notes
FROM Habits h
CROSS JOIN (
    SELECT 0 AS day_offset, CURDATE() AS log_date UNION ALL
    SELECT 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY) UNION ALL
    SELECT 2, DATE_SUB(CURDATE(), INTERVAL 2 DAY) UNION ALL
    SELECT 3, DATE_SUB(CURDATE(), INTERVAL 3 DAY) UNION ALL
    SELECT 4, DATE_SUB(CURDATE(), INTERVAL 4 DAY) UNION ALL
    SELECT 5, DATE_SUB(CURDATE(), INTERVAL 5 DAY) UNION ALL
    SELECT 6, DATE_SUB(CURDATE(), INTERVAL 6 DAY) UNION ALL
    SELECT 7, DATE_SUB(CURDATE(), INTERVAL 7 DAY) UNION ALL
    SELECT 8, DATE_SUB(CURDATE(), INTERVAL 8 DAY) UNION ALL
    SELECT 9, DATE_SUB(CURDATE(), INTERVAL 9 DAY) UNION ALL
    SELECT 10, DATE_SUB(CURDATE(), INTERVAL 10 DAY) UNION ALL
    SELECT 11, DATE_SUB(CURDATE(), INTERVAL 11 DAY) UNION ALL
    SELECT 12, DATE_SUB(CURDATE(), INTERVAL 12 DAY) UNION ALL
    SELECT 13, DATE_SUB(CURDATE(), INTERVAL 13 DAY) UNION ALL
    SELECT 14, DATE_SUB(CURDATE(), INTERVAL 14 DAY) UNION ALL
    SELECT 15, DATE_SUB(CURDATE(), INTERVAL 15 DAY) UNION ALL
    SELECT 16, DATE_SUB(CURDATE(), INTERVAL 16 DAY) UNION ALL
    SELECT 17, DATE_SUB(CURDATE(), INTERVAL 17 DAY) UNION ALL
    SELECT 18, DATE_SUB(CURDATE(), INTERVAL 18 DAY) UNION ALL
    SELECT 19, DATE_SUB(CURDATE(), INTERVAL 19 DAY) UNION ALL
    SELECT 20, DATE_SUB(CURDATE(), INTERVAL 20 DAY) UNION ALL
    SELECT 21, DATE_SUB(CURDATE(), INTERVAL 21 DAY) UNION ALL
    SELECT 22, DATE_SUB(CURDATE(), INTERVAL 22 DAY) UNION ALL
    SELECT 23, DATE_SUB(CURDATE(), INTERVAL 23 DAY) UNION ALL
    SELECT 24, DATE_SUB(CURDATE(), INTERVAL 24 DAY) UNION ALL
    SELECT 25, DATE_SUB(CURDATE(), INTERVAL 25 DAY) UNION ALL
    SELECT 26, DATE_SUB(CURDATE(), INTERVAL 26 DAY) UNION ALL
    SELECT 27, DATE_SUB(CURDATE(), INTERVAL 27 DAY) UNION ALL
    SELECT 28, DATE_SUB(CURDATE(), INTERVAL 28 DAY) UNION ALL
    SELECT 29, DATE_SUB(CURDATE(), INTERVAL 29 DAY)
) d;
