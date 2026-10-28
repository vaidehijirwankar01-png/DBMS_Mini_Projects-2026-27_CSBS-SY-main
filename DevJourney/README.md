# DevJourney — DSA & Project Tracker
**DBMS Mini Project | CSBS-SY (2026-27)**

---

## 1. Project Overview
**DevJourney** is a full-stack developer productivity and progress tracking application built with **Flask**, **PostgreSQL**, and a responsive **HTML5/CSS3/JavaScript** single-page interface. 

The application solves the challenge of inconsistent Data Structures & Algorithms (DSA) preparation and fragmented project tracking by providing:
- A unified personal dashboard with real-time statistics computed directly from PostgreSQL.
- A DSA problem tracker categorized by topics with direct LeetCode links.
- Full CRUD lifecycle tracking for personal development projects.
- Weekly goal management with automatic target bound clamping.
- Live activity logging and streak analytics, featuring a **90-day contribution heatmap** and **Monday–Sunday weekly activity chart**.

---

## 2. Technology Stack
- **Frontend:** HTML5, CSS3 (Modern Dark Theme, Custom Flexbox/CSS Grid), Vanilla JavaScript (Async/Await, Fetch API)
- **Backend:** Python 3.12, Flask 3.1.3, Flask-CORS 6.0.5
- **Database:** PostgreSQL 16
- **Database Connector:** `psycopg2-binary` 2.9.12 (Direct connection pool & parameterized SQL)
- **Authentication & Security:** `bcrypt` 5.0.0 (salted password hashing), HTTP-only server sessions, strict SQL injection prevention

---

## 3. Database Architecture & Schema Design
The relational database consists of 6 core tables with strict referential integrity (`ON DELETE CASCADE`):

```
       +---------------------------------------------+
       |                    users                    |
       |---------------------------------------------|
       | id (PK)                                     |
       | name, email, password_hash, github_username |
       +---------------------------------------------+
              |              |              |
              | 1:N          | 1:N          | 1:N
              v              v              v
     +--------------+  +----------+  +----------+
     |  dsa_topics  |  | projects |  |  goals   |
     +--------------+  +----------+  +----------+
              |
              | 1:N
              v
     +--------------+
     | dsa_problems |
     +--------------+
              |
              | 1:N
              v
     +--------------+
     |   activity   |  <--- (user_id FK, problem_id FK, completed_at)
     +--------------+
```

### Table Definitions:
1. **`users`**: Stores user authentication credentials. Passwords are encrypted using salted `bcrypt` hashes.
2. **`dsa_topics`**: Stores topics (e.g. *Arrays*, *Binary Search*, *Trees*), maintaining problem counts and solved counts.
3. **`dsa_problems`**: Individual problems under a topic, tracking difficulty, LeetCode URL, and completion status.
4. **`projects`**: Project tracking with title, description, tech stack tags, status (`planned`, `in progress`, `completed`), and progress percentage (0-100%).
5. **`goals`**: Weekly targets with `current_count`, `target_count`, `timeframe`, and `is_completed`.
6. **`activity`**: Timestamped ledger of problem completion events used to calculate streaks and heatmap intensity.

---

## 4. Key Features & Algorithms

### A. Real-Time Streak & Analytics Engine
- **Current Streak Calculation**: Queries `DATE(completed_at)` from `activity`. If active today, counts backwards consecutively; if active yesterday, preserves the streak (grace period); resets to 0 if inactive for 2 or more days.
- **Longest Streak**: Evaluates the maximum consecutive calendar days across all historical records.
- **90-Day Contribution Heatmap Grid**: Renders 90 daily cells (`today - 89 days` to `today`) mapped to 5 intensity levels:
  - Level 0: 0 solved
  - Level 1: 1 solved
  - Level 2: 2 solved
  - Level 3: 3–4 solved
  - Level 4: 5+ solved
- **Weekly Activity Chart**: Dynamically computes Monday through Sunday of the current week with scaled percentage bar heights and current day highlight.

### B. Project & Goals Management
- **Status-Progress Synchronization**: Setting status to `completed` enforces 100% progress; setting to `planned` sets 0%; intermediate percentages automatically transition to `in progress`.
- **Target Bound Clamping**: Goal progress cannot exceed `target_count`; reaching the target automatically marks `is_completed = TRUE`.

---

## 5. Installation and Setup Guide

### Prerequisites
- Python 3.10+
- PostgreSQL 14+
- Git

### Step 1: Clone the Repository
```bash
git clone https://github.com/ankitamilk2007-eng/DBMS_Mini_Projects-2026-27_CSBS-SY.git
cd DBMS_Mini_Projects-2026-27_CSBS-SY/DevJourney
```

### Step 2: Database Setup
1. Create a PostgreSQL database:
```sql
CREATE DATABASE dev_journey;
```
2. Initialize tables using the provided `schema.sql`:
```bash
psql -U postgres -d dev_journey -f schema.sql
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` and fill in your PostgreSQL credentials:
```bash
cp .env.example .env
```
Edit `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dev_journey
DB_USER=postgres
DB_PASSWORD=replace_with_your_postgres_password
SECRET_KEY=replace_with_your_own_secret_key
```

### Step 4: Python Virtual Environment & Dependencies
```bash
python -m venv venv

# Windows:
venv\Scripts\activate

# Linux/macOS:
source venv/bin/activate

# Install required packages:
pip install -r requirements.txt
```

### Step 5: Run the Application
```bash
python app.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000/
```

---

## 6. Sample Dataset for Demonstration
The repository includes sample activity and streak data files for testing and evaluation:
- `sample_streak_dataset.json`: Structured JSON containing a 90-day activity matrix, 4-day current streak, 7-day longest streak, and weekly breakdown.
- `sample_streak_dataset.sql`: SQL statements to populate demo activity records.

---

## 7. Security and Integrity
- **Password Protection**: Passwords are never stored in plaintext; all credentials use bcrypt hashing with random salt.
- **SQL Injection Prevention**: All SQL queries use psycopg2 parameterized placeholders (`%s`).
- **Cascade Protection**: Deleting a topic or problem cleanly cleans up associated activity entries without orphaned records.
- **Cross-User Isolation**: Ownership checks verify that users can only view or modify their own topics, problems, projects, and goals.

---

## 8. Author
- **Project:** DevJourney – DSA & Project Tracker
- **Course:** DBMS Mini Project (2026-27)
- **Class:** CSBS-SY
