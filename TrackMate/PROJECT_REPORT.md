# Academic Mini-Project Report: TrackMate
## Personal Study & Habit Tracking System

**Academic Year**: 2026–2027  
**Department**: Computer Science and Business Systems  
**Subject**: Database Management Systems (DBMS)  
**Project Title**: TrackMate — Personal Study & Daily Habit Tracker  

---

### Abstract
College students in technical and business engineering curricula face a demanding academic workload characterized by continuous lecture cycles, programming assignments, laboratory tests, and semester examinations. Existing commercial productivity tools often suffer from bloated subscription paywalls, intrusive advertisements, or isolated functionalities that separate habit tracking from academic course logging. 

**TrackMate** is a full-stack, database-backed web application engineered specifically for engineering students. It implements a closed-loop academic productivity cycle: **PLAN $\rightarrow$ FOCUS $\rightarrow$ TRACK $\rightarrow$ ANALYZE $\rightarrow$ IMPROVE**. Built with Python, Flask, MySQL, HTML5, CSS3, and JavaScript, TrackMate delivers relational integrity, parameterized query security, real-time analytics, Pomodoro timeboxing, curriculum balancing algorithms, and daily habit consistency tracking. The system adheres to relational database principles, Boyce-Codd Normal Form (BCNF), and REST architectural standards.

---

### 1. Introduction
Modern engineering education requires sustained, deliberate practice across multiple challenging disciplines (e.g., Database Systems, Algorithms, Operating Systems, Computer Architecture). Without structured tracking, students experience curriculum imbalances, cramming before exams, and cognitive fatigue. 

TrackMate solves this challenge by unifying:
1. **Coursework logging** with exact time allocations.
2. **Habitual routines** with daily boolean checkoffs and streak preservation.
3. **Structured planning** to separate forward-looking tasks from completed deep work.
4. **Focused execution** using a Pomodoro timer with direct database logging.
5. **Data-driven insights** to eliminate curriculum blind spots.

---

### 2. Problem Statement
Traditional study tracking methods rely on paper notebooks, generic spreadsheets, or disparate mobile apps:
* **Spreadsheets**: Lack referential integrity, automated streak calculations, and input validation; vulnerable to accidental data corruption.
* **Commercial Apps**: Split across separate tools (one for Pomodoro, another for habits, another for calendar); lack curriculum-specific analytics.
* **No Closed-Loop Feedback**: Students cannot easily assess whether their study distribution aligns with upcoming exam dates or credit weightings.

---

### 3. Project Objectives
1. **Relational Database Integrity**: Construct a robust relational schema in MySQL with foreign key constraints, unique constraints, and indexes.
2. **Comprehensive Study Session CRUD**: Enable students to record, review, modify, and delete study sessions with zero data corruption.
3. **Daily Habit Consistency Engine**: Provide persistent habit tracking with unique candidate key constraints `(habit_id, log_date)` to prevent duplicate daily submissions.
4. **Focus Timeboxing Integration**: Implement a drift-free Pomodoro timer that directly logs verified focus sessions into the database.
5. **Curriculum Analytics & Attention Indices**: Calculate fair-share subject percentages, identify neglected subjects, and output explainable weekly insights.
6. **Academic Submission Readiness**: Provide transparent documentation, test suites, and automated migration scripts.

---

### 4. Software Requirements Specification (SRS)

#### 4.1 Functional Requirements
* **FR1 (Course Management)**: The system shall support CRUD operations on subjects with unique name constraints.
* **FR2 (Study Session Logging)**: The system shall record sessions with subject ID, topic, date, start time, duration in minutes, and notes.
* **FR3 (Session Modification)**: The system shall support editing study sessions via a RESTful `PUT` endpoint with full form prefilling.
* **FR4 (Habit Tracking)**: The system shall support daily habit toggling with idempotent upsert behavior for any calendar date.
* **FR5 (Productivity Statistics)**: The system shall compute total sessions, total hours, active habits, completed habits today, and 7-day volume trends.
* **FR6 (Smart Planner)**: The system shall manage planned tasks with priority levels, deadlines, and overdue flags separate from actual study time.
* **FR7 (Focus Timer)**: The system shall provide Pomodoro (25m), Short Break (5m), and Long Break (15m) intervals with auto-logging to sessions.
* **FR8 (Data Export)**: The system shall export study sessions, habit logs, and tasks into UTF-8 BOM CSV files.

#### 4.2 Non-Functional Requirements
* **NFR1 (Performance)**: Queries on frequently filtered fields (`study_date`, `subject_id`, `log_date`) shall execute in $<10$ ms using secondary B-tree indexes.
* **NFR2 (Security)**: All database interactions shall use parameterized SQL queries to prevent SQL Injection attacks.
* **NFR3 (Reliability)**: The database connection manager shall ensure cursors and connections are properly closed in `finally` blocks.
* **NFR4 (Usability & Design)**: The interface shall use an elegant, eye-friendly Black + Lavender theme (`#0B0A10`, `#17151F`, `#1D1A27`, `#A78BFA`, `#8B5CF6`) designed for prolonged study sessions with responsive mobile/desktop layouts.
* **NFR5 (Security & Cryptography)**: User passwords shall be cryptographically hashed using PBKDF2:SHA256 with random per-user salts. Plaintext passwords or hashes shall never be exposed in API payloads, sessions shall use `HttpOnly` cookie flags, and error messages shall use generic anti-enumeration patterns.

---

### 5. System Architecture

```text
+--------------------------------------------------------------+
|                    Browser Client (UI/UX)                   |
|  - HTML5 / CSS3 (Black + Lavender Design System)             |
|  - Modern Login & Registration Pages with Validation         |
|  - Vanilla JavaScript ES6+ Fetch API & Session Authentication|
|  - Interactive Chart.js Visualizations                       |
+------------------------------+-------------------------------+
                               | JSON Requests / Session Cookies
                               v
+--------------------------------------------------------------+
|               Flask REST Backend (Python 3.10+)              |
|  - Route Dispatcher & Session Auth Decorators                |
|  - PBKDF2:SHA256 Cryptographic Password Hasher               |
|  - Per-User Tenancy Query Scoping (`WHERE user_id = %s`)     |
|  - TrackMateJSONProvider (Decimal Serialization)             |
|  - Global Database Error Handler                             |
+------------------------------+-------------------------------+
                               | Parameterized SQL
                               v
+--------------------------------------------------------------+
|                 MySQL Database (trackmate_db)                |
|  - InnoDB Storage Engine (ACID Compliant)                    |
|  - 10 Relational Tables with Foreign Keys, Cascades & Indexes|
|  - Non-destructive Schema Migration (Zero Historical Loss)  |
+--------------------------------------------------------------+
```

---

### 6. Database Design & Schema Specifications

The database schema contains 10 interconnected relational tables:
1. **`users`**: Central student credentials (`user_id`, `name`, `email`, `password_hash`, `created_at`).
2. **`Subjects`**: Course catalog (`subject_id`, `user_id`, `subject_name`, `created_at`).
3. **`Study_Sessions`**: Study records (`session_id`, `user_id`, `subject_id`, `topic`, `study_date`, `start_time`, `duration_minutes`, `notes`).
4. **`Habits`**: Daily/weekly routines (`habit_id`, `user_id`, `habit_name`, `description`, `frequency`, `is_active`).
5. **`Habit_Logs`**: Daily completions (`log_id`, `user_id`, `habit_id`, `log_date`, `completed`, `notes`). Unique constraint on `(habit_id, log_date)`.
6. **`user_profile`**: Target preferences (`id`, `user_id`, `full_name`, `email`, `major`, `daily_goal_hours`, `weekly_goal_hours`, `semester_goal_hours`).
7. **`Study_Tasks`**: Planner backlog (`task_id`, `user_id`, `title`, `description`, `subject_id`, `due_date`, `priority`, `status`).
8. **`Exams`**: Examination countdowns (`exam_id`, `user_id`, `exam_name`, `subject_id`, `exam_date`, `notes`).
9. **`Notes`**: Revision summaries (`note_id`, `user_id`, `title`, `content`, `subject_id`, `tags`, `is_pinned`, `color`).
10. **`Flashcards`**: Spaced repetition cards (`flashcard_id`, `user_id`, `subject_id`, `note_id`, `question`, `answer`, `mastery_level`).

#### Normalization Summary
* **1NF**: Atomic attributes, no repeating groups.
* **2NF**: Full functional dependency on primary keys.
* **3NF**: No transitive dependencies ($X \rightarrow Y \rightarrow Z$ eliminated).
* **BCNF**: Every determinant in functional dependencies is a superkey.

---

### 7. Implementation & Module Descriptions

1. **Authentication & Multi-Tenancy Module**:
   - Secure student registration (`POST /register`) with password length, confirmation, and duplicate email enforcement.
   - Authentication gateway (`POST /login`) verifying PBKDF2:SHA256 salted hashes and establishing cryptographically signed `HttpOnly` sessions.
   - Per-user query scoping: every SQL query is dynamically bound to the current session's `user_id` (`WHERE user_id = %s`), preventing cross-user data leakage and horizontal privilege escalation.
2. **Study Session CRUD Module**:
   - Implements full validation: ensures duration $> 0$, non-empty topics, valid dates, and existence of foreign key `subject_id`.
   - Update handler (`PUT /api/study-sessions/<int:id>`) verifies ownership and preselects existing values.
3. **Habits Engine Module**:
   - Queries `Habits` joined with `Habit_Logs` on the selected date for the authenticated user.
   - Idempotently inserts or updates completion state without generating duplicate rows.
4. **Pomodoro Focus Timer Module**:
   - Implemented with timestamp anchoring (`Date.now() + remainingMs`) to resist browser tab throttling and background suspension.
   - Provides optional association with course subjects and auto-logs completed 25-minute intervals.
5. **Curriculum Balance Analyzer**:
   - Computes each course's percentage of total recorded time against the fair-share threshold ($100 / N$).
   - Flags courses with zero hours as "Curriculum Blind Spots".

---

### 8. Testing & Quality Assurance

* **Unit Testing**: Verified date/time parsers, positive integer validators, and streak math over 11 test cases in `tests/test_standalone.py` with 100% pass rate.
* **Multi-User Security Testing**: Executed 15 automated test cases in `tests/test_auth_multiuser.py` validating registration, duplicate emails, password mismatch, short passwords, login verification, generic anti-enumeration messages, unauthenticated 401 blocks, multi-tenant isolation, ID tampering prevention, logout termination, `/api/auth/me`, and cryptographic PBKDF2 hashing.
* **Total Automated Test Suite**: 26/26 tests passing in 7.6 seconds.
* **Database Connection Resilience**: Added an application-level error handler for `mysql.connector.Error` that returns structured 500 JSON payloads instead of unformatted crash pages.

---

### 9. Advantages & Limitations

#### Advantages
* **Enterprise-Grade Student Privacy**: Full multi-tenant data isolation ensures each student's study sessions, grades, and habits remain strictly confidential.
* **Cryptographic Security**: Salted PBKDF2 password hashes, session fixation prevention, and generic login error handling adhere to OWASP guidelines.
* **Non-Destructive Database Migration**: Safe migration scripts (`02_multi_user_auth_migration.sql`) preserve 100% of historical student data without table dropping.
* **Tailored for College Workflow**: Integrates study logging, Pomodoro timer, and habit tracking into a unified Black + Lavender interface.
* **ACID Integrity**: MySQL InnoDB foreign keys prevent orphaned session records when subjects are managed.

#### Limitations
* Requires MySQL server to be running locally on port 3306 (or configured via environment variables).

---

### 10. Conclusion & Future Scope
TrackMate demonstrates the practical application of relational database management systems and web security engineering to personal academic productivity. By enforcing multi-tenant data isolation, relational integrity, Boyce-Codd Normal Form, salted cryptographic password hashing, and structured REST API design, the application provides an authentic, reliable, and secure productivity system suitable for university evaluation. Future enhancements may include peer study rooms via WebSockets and external calendar synchronization.
